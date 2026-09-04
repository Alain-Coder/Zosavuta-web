-- Zosavuta MySQL Schema
CREATE DATABASE IF NOT EXISTS zosavuta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zosavuta;

-- ─── Users ───
CREATE TABLE IF NOT EXISTS users (
  uid          VARCHAR(128) NOT NULL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  fullName     VARCHAR(255) NOT NULL,
  role         ENUM('customer','organizer','customer_organizer','admin') NOT NULL DEFAULT 'customer',
  provider     VARCHAR(32)  NOT NULL DEFAULT 'email',
  createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ─── Events ───
CREATE TABLE IF NOT EXISTS events (
  id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT,
  fullDescription  TEXT,
  category         VARCHAR(32)   NOT NULL DEFAULT 'music',
  date             DATE          NOT NULL,
  time             TIME          NOT NULL,
  location         VARCHAR(255)  NOT NULL,
  venue            VARCHAR(255)  NOT NULL,
  image            VARCHAR(512),
  price            DECIMAL(10,2) NOT NULL DEFAULT 0,
  ticketsTotal     INT           NOT NULL DEFAULT 0,
  ticketsAvailable INT           NOT NULL DEFAULT 0,
  organizerId      VARCHAR(128)  NOT NULL,
  status           ENUM('active','draft','sold_out','cancelled') NOT NULL DEFAULT 'active',
  busTransport     TINYINT(1)   NOT NULL DEFAULT 0,
  seatingChart     TINYINT(1)   NOT NULL DEFAULT 0,
  createdAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_events_organizer (organizerId),
  INDEX idx_events_status (status),
  INDEX idx_events_category (category),
  INDEX idx_events_date (date),
  FOREIGN KEY (organizerId) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Event Submissions (organizer → admin approval) ───
CREATE TABLE IF NOT EXISTS event_submissions (
  id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT,
  fullDescription  TEXT,
  category         VARCHAR(32)   NOT NULL DEFAULT 'music',
  date             DATE          NOT NULL,
  time             TIME          NOT NULL,
  location         VARCHAR(255)  NOT NULL,
  venue            VARCHAR(255)  NOT NULL,
  image            VARCHAR(512),
  price            DECIMAL(10,2) DEFAULT NULL,
  ticketsTotal     INT           DEFAULT NULL,
  organizerId      VARCHAR(128)  NOT NULL,
  busTransport     TINYINT(1)   NOT NULL DEFAULT 0,
  seatingChart     TINYINT(1)   NOT NULL DEFAULT 0,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ticketDetailsSubmitted TINYINT(1) NOT NULL DEFAULT 0,
  rejectionReason  TEXT,
  reviewedBy       VARCHAR(128),
  reviewedAt       DATETIME,
  eventId          INT,
  createdAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_submissions_organizer (organizerId),
  INDEX idx_submissions_status (status),
  FOREIGN KEY (organizerId) REFERENCES users(uid) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Orders (event bookings) ───
CREATE TABLE IF NOT EXISTS orders (
  id             VARCHAR(64)   NOT NULL PRIMARY KEY,
  userId         VARCHAR(128)  NOT NULL,
  eventId        INT           NOT NULL,
  eventTitle     VARCHAR(255)  NOT NULL,
  eventDate      DATE          NOT NULL,
  eventTime      TIME          NOT NULL,
  eventLocation  VARCHAR(255)  NOT NULL,
  eventVenue     VARCHAR(255)  NOT NULL,
  eventImage     VARCHAR(512),
  quantity       INT           NOT NULL DEFAULT 1,
  price          DECIMAL(10,2) NOT NULL DEFAULT 0,
  totalAmount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  status         ENUM('confirmed','pending','used','refunded','cancelled') NOT NULL DEFAULT 'confirmed',
  tier           VARCHAR(32)  DEFAULT 'Regular',
  firstName      VARCHAR(128),
  lastName       VARCHAR(128),
  email          VARCHAR(255),
  phone          VARCHAR(32),
  paymentMethod  VARCHAR(64),
  busTransport   TINYINT(1)  NOT NULL DEFAULT 0,
  createdAt      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (userId),
  INDEX idx_orders_event (eventId),
  INDEX idx_orders_status (status),
  FOREIGN KEY (userId)  REFERENCES users(uid) ON DELETE CASCADE,
  FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Order Tickets (QR) ───
CREATE TABLE IF NOT EXISTS order_tickets (
  id           INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  orderId      VARCHAR(64) NOT NULL,
  ticketNumber VARCHAR(64) NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_tickets_order (orderId)
) ENGINE=InnoDB;

-- ─── Bus Operators ───
CREATE TABLE IF NOT EXISTS bus_operators (
  id        VARCHAR(64)  NOT NULL PRIMARY KEY,
  userId    VARCHAR(128),
  name      VARCHAR(255) NOT NULL,
  email     VARCHAR(255) NOT NULL,
  phone     VARCHAR(32),
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Buses ───
CREATE TABLE IF NOT EXISTS buses (
  id             VARCHAR(64) NOT NULL PRIMARY KEY,
  operatorId     VARCHAR(64) NOT NULL,
  licensePlate   VARCHAR(32) NOT NULL,
  capacity       INT         NOT NULL DEFAULT 50,
  model          VARCHAR(128),
  seatLayoutType VARCHAR(16),
  amenities      JSON,
  createdAt      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_buses_operator (operatorId),
  FOREIGN KEY (operatorId) REFERENCES bus_operators(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Routes ───
CREATE TABLE IF NOT EXISTS routes (
  id                VARCHAR(64)   NOT NULL PRIMARY KEY,
  operatorId        VARCHAR(64)   NOT NULL,
  name              VARCHAR(255)  NOT NULL,
  origin            VARCHAR(128)  NOT NULL,
  destination       VARCHAR(128)  NOT NULL,
  basePrice         DECIMAL(10,2) NOT NULL DEFAULT 0,
  distanceKm        INT,
  estimatedDuration INT,
  createdAt         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_routes_operator (operatorId),
  FOREIGN KEY (operatorId) REFERENCES bus_operators(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Trips ───
CREATE TABLE IF NOT EXISTS trips (
  id             VARCHAR(64)   NOT NULL PRIMARY KEY,
  routeId        VARCHAR(64)   NOT NULL,
  busId          VARCHAR(64)   NOT NULL,
  departureTime  DATETIME      NOT NULL,
  arrivalTime    DATETIME      NOT NULL,
  price          DECIMAL(10,2) NOT NULL DEFAULT 0,
  seatsAvailable INT           NOT NULL DEFAULT 0,
  availableSeats INT           NOT NULL DEFAULT 0,
  bookedSeats    INT           NOT NULL DEFAULT 0,
  status         ENUM('Scheduled','Departed','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  createdAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trips_route (routeId),
  INDEX idx_trips_bus (busId),
  FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (busId)   REFERENCES buses(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Bus Bookings ───
CREATE TABLE IF NOT EXISTS bus_bookings (
  id               VARCHAR(64)   NOT NULL PRIMARY KEY,
  tripId           VARCHAR(64)   NOT NULL,
  userId           VARCHAR(128)  NOT NULL,
  seats            INT           NOT NULL DEFAULT 1,
  totalPrice       DECIMAL(10,2) NOT NULL DEFAULT 0,
  status           ENUM('confirmed','cancelled','pending') NOT NULL DEFAULT 'confirmed',
  paymentStatus    ENUM('paid','unpaid','refunded') NOT NULL DEFAULT 'unpaid',
  bookingReference VARCHAR(64),
  operatorId       VARCHAR(64),
  seatNumbers      JSON,
  createdAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bus_bookings_trip (tripId),
  INDEX idx_bus_bookings_user (userId),
  INDEX idx_bus_bookings_operator (operatorId),
  FOREIGN KEY (tripId)     REFERENCES trips(id)         ON DELETE CASCADE,
  FOREIGN KEY (userId)     REFERENCES users(uid)         ON DELETE CASCADE,
  FOREIGN KEY (operatorId) REFERENCES bus_operators(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Bus Tickets ───
CREATE TABLE IF NOT EXISTS bus_tickets (
  id            VARCHAR(64) NOT NULL PRIMARY KEY,
  bookingId     VARCHAR(64) NOT NULL,
  qrCode        VARCHAR(255),
  checkInStatus ENUM('checkedIn','notCheckedIn') NOT NULL DEFAULT 'notCheckedIn',
  seatNumber    VARCHAR(16),
  issuedAt      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scannedAt     DATETIME,
  INDEX idx_bus_tickets_booking (bookingId),
  FOREIGN KEY (bookingId) REFERENCES bus_bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Points Ledger ───
CREATE TABLE IF NOT EXISTS points_ledger (
  id            INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId        VARCHAR(128) NOT NULL,
  points        INT         NOT NULL DEFAULT 0,
  type          ENUM('earned','redeemed') NOT NULL DEFAULT 'earned',
  description   VARCHAR(255),
  relatedOrderId VARCHAR(64),
  createdAt     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_points_user (userId),
  FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Resale Listings ───
CREATE TABLE IF NOT EXISTS resale_listings (
  id            VARCHAR(64)   NOT NULL PRIMARY KEY,
  orderId       VARCHAR(64)   NOT NULL,
  eventId       INT           NOT NULL,
  sellerId      VARCHAR(128)  NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  originalPrice DECIMAL(10,2) NOT NULL,
  status        ENUM('available','sold','cancelled') NOT NULL DEFAULT 'available',
  createdAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resale_event (eventId),
  INDEX idx_resale_seller (sellerId),
  FOREIGN KEY (orderId)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (eventId)  REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (sellerId) REFERENCES users(uid)  ON DELETE CASCADE
) ENGINE=InnoDB;
