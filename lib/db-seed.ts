import { db } from './firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { DEMO_EVENTS, DEMO_BOOKINGS, DEMO_USERS } from './mock-data';

export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    const batch = writeBatch(db);

    // Seed Events
    console.log('Seeding events...');
    for (const event of DEMO_EVENTS) {
      const eventRef = doc(db, 'events', event.id);
      batch.set(eventRef, event);
    }

    // Seed Bookings (Orders)
    console.log('Seeding bookings...');
    for (const booking of DEMO_BOOKINGS) {
      const bookingRef = doc(db, 'orders', booking.id);
      batch.set(bookingRef, booking);
    }

    // Seed Users
    console.log('Seeding users...');
    for (const user of DEMO_USERS) {
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, user);
    }

    // Commit all changes
    await batch.commit();
    console.log('Database seeding completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
}
