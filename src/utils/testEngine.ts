import { parseMercadoLibreExcel } from './mercadoLibreEngine.js';

const mockUSData = [
  ['Order #', 'SKU', 'Status', 'Order date', 'Total'],
  ['US-001', 'SKU-USA', 'Delivered', 'April 24, 2026 08:40 PM GMT-06:00', '50.0'],
  ['US-002', 'SKU-USB', 'Refunded', 'April 25, 2026 10:15 AM GMT-06:00', '30.0'],
  ['US-003', 'SKU-USC', 'Approved', 45405.5, '100.0'], // Excel numeric date (2024-04-24 approx)
];

console.log("--- Testing US Date Format Fix ---");
try {
  const summary = parseMercadoLibreExcel(mockUSData);
  console.log("Total Orders:", summary.data.length);
  summary.data.forEach((order, index) => {
    console.log(`Order ${index+1}:`);
    console.log(`  ID: ${order.orderId}`);
    console.log(`  Date: ${order.date}`);
    console.log(`  Status: ${order.status}`);
    const isValid = !isNaN(new Date(order.date).getTime());
    console.log(`  Valid Date Object: ${isValid}`);
  });
  
  if (summary.data.every(d => !isNaN(new Date(d.date).getTime()))) {
    console.log("\nALL DATES PARSED SUCCESSFULLY!");
  } else {
    console.error("\nSOME DATES ARE STILL INVALID!");
  }
} catch (e) {
  console.error("Test Failed:", e.message);
}
