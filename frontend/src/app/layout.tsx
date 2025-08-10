import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhatsApp Enterprise',
  description: 'Enterprise WhatsApp Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>{`
          /* Admin Panel Styles - WhatsApp Enterprise */
          .whatsapp-gradient {
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          }
          .card-shadow {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
          }
          .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #FF3B30;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          .toggle-checkbox:checked {
            right: 0;
            background-color: #25D366;
          }
          .toggle-checkbox:checked + .toggle-label {
            background-color: #128C7E;
          }
          .sidebar-item:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .sidebar-item.active {
            background-color: rgba(255, 255, 255, 0.2);
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          /* Carousel Styles */
          .carousel-container {
            overflow: visible;
            position: relative;
          }
          
          .carousel-slide {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideIn 0.5s ease-out;
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .carousel-nav-button {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
          }
          
          .carousel-nav-button:hover:not(:disabled) {
            transform: scale(1.15) translateY(-2px);
            box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
          }
          
          .carousel-nav-button:active:not(:disabled) {
            transform: scale(1.05);
          }
          
          .carousel-indicator {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          
          .carousel-indicator:hover {
            transform: scale(1.3);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          .whatsapp-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .whatsapp-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }
          
          /* Modal Styles */
          .modal-backdrop {
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          
          .modal-content {
            animation: modalSlideIn 0.3s ease-out;
          }
          
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          .qr-container {
            transition: all 0.3s ease-in-out;
          }
          
          .qr-container:hover {
            border-color: #10b981;
            background-color: #f0fdf4;
          }
        `}</style>
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
