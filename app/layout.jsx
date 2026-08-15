import "./globals.css";

export const metadata = {
  title: "The Exchange",
  description: "Royal Bourse of the Footballing Realm",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Courier+Prime:wght@400;700&family=UnifrakturMaguntia&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><div className="realm">{children}</div></body>
    </html>
  );
}
