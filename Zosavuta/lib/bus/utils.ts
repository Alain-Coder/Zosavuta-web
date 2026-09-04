// lib/bus/utils.ts

/**
 * Generates seat labels for a bus based on its capacity and layout style.
 * 
 * @param capacity The total number of seats.
 * @param layoutType The layout style ('2x2', '2x1', or 'consecutive').
 * @returns An array of seat labels (e.g. ["1A", "1B", "1C", "1D", ...]).
 */
export function generateSeatLabels(capacity: number, layoutType: '2x2' | '2x1' | 'consecutive'): string[] {
  const seats: string[] = [];
  if (layoutType === '2x2') {
    const seatsPerRow = 4;
    const rows = Math.ceil(capacity / seatsPerRow);
    const letters = ['A', 'B', 'C', 'D'];
    for (let r = 1; r <= rows; r++) {
      for (let l = 0; l < seatsPerRow; l++) {
        if (seats.length < capacity) {
          seats.push(`${r}${letters[l]}`);
        }
      }
    }
  } else if (layoutType === '2x1') {
    const seatsPerRow = 3;
    const rows = Math.ceil(capacity / seatsPerRow);
    const letters = ['A', 'B', 'C'];
    for (let r = 1; r <= rows; r++) {
      for (let l = 0; l < seatsPerRow; l++) {
        if (seats.length < capacity) {
          seats.push(`${r}${letters[l]}`);
        }
      }
    }
  } else {
    for (let i = 1; i <= capacity; i++) {
      seats.push(i.toString());
    }
  }
  return seats;
}

/**
 * Returns a matrix representing the grid of seats for display.
 * Null elements in a row represent an aisle.
 */
export function getSeatGrid(capacity: number, layoutType: '2x2' | '2x1' | 'consecutive'): (string | null)[][] {
  const labels = generateSeatLabels(capacity, layoutType);
  const grid: (string | null)[][] = [];

  if (layoutType === '2x2') {
    const rows = Math.ceil(capacity / 4);
    for (let r = 0; r < rows; r++) {
      const rowSeats: (string | null)[] = [];
      // Left side: A, B
      rowSeats.push(labels[r * 4] || null);
      rowSeats.push(labels[r * 4 + 1] || null);
      // Aisle
      rowSeats.push(null);
      // Right side: C, D
      rowSeats.push(labels[r * 4 + 2] || null);
      rowSeats.push(labels[r * 4 + 3] || null);
      grid.push(rowSeats);
    }
  } else if (layoutType === '2x1') {
    const rows = Math.ceil(capacity / 3);
    for (let r = 0; r < rows; r++) {
      const rowSeats: (string | null)[] = [];
      // Left side: A, B
      rowSeats.push(labels[r * 3] || null);
      rowSeats.push(labels[r * 3 + 1] || null);
      // Aisle
      rowSeats.push(null);
      // Right side: C
      rowSeats.push(labels[r * 3 + 2] || null);
      grid.push(rowSeats);
    }
  } else {
    // Consecutive layout: 4 seats per row with no aisle
    const seatsPerRow = 4;
    const rows = Math.ceil(capacity / seatsPerRow);
    for (let r = 0; r < rows; r++) {
      const rowSeats: (string | null)[] = [];
      for (let c = 0; c < seatsPerRow; c++) {
        rowSeats.push(labels[r * seatsPerRow + c] || null);
      }
      grid.push(rowSeats);
    }
  }
  return grid;
}
