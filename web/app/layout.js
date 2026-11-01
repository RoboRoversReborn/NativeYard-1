import "./globals.css";

export const metadata = {
  title: "NativeYard – AI Landscape Native & Invasive Plant Yard Audit",
  description: "Upload a photo of your landscape to identify native, non-native, and invasive plants with Green, Orange, and Red bounding boxes, and calculate your yard ecosystem score.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌿</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
