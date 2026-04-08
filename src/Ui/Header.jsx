import { BiNotification } from "react-icons/bi";
import { MdNotifications } from "react-icons/md";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header
      dir="rtl"
      className="flex justify-between items-center p-4 border-b border-gray-300"
    >
      <nav className="flex gap-4">
        <MdNotifications className="text-2xl cursor-pointer" />
      </nav>
      <img src="./welady.png" alt="Weladi Logo" className="h-12 w-12" />
    </header>
  );
}
