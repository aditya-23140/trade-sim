"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const Navbar = () => {
  const [profileToast, setProfileToast] = useState(false);

  return (
    <nav className="flex flex-col justify-between items-center fixed h-[96%] m-4 pt-4 pb-2 px-2 bg-[#222222] rounded-full z-50">
      <div className="flex gap-2 manrope-regular">
        <Link href={"/"}>
          <Image src={"/favicon.png"} width={32} height={32} alt="icon" />
        </Link>
      </div>
      <ul className="flex flex-col gap-8 text-[#c694ff]">
        <Link href={"/"}>
          <Image src="/dashboard.png" width={32} height={32} alt="dashboard" />
        </Link>
        <Link href={"/"}>
          <Image src="/market.png" width={32} height={32} alt="market" />
        </Link>
        <Link href={"/"}>
          <Image src="/futures-options.png" width={32} height={32} alt="f&o" />
        </Link>
      </ul>
      <div className="flex flex-col gap-2 items-center relative">
        <Link
          href={"/"}
          onMouseEnter={() => {
            setProfileToast(true);
          }}
          onMouseLeave={() => {
            setProfileToast(false);
          }}
        >
          <Image
            src="/profile.png"
            width={32}
            height={32}
            alt="profile"
          />
        </Link>
        {profileToast && (
          <div className="flex flex-col absolute left-12 bottom-0 bg-[#242424] rounded-md">
            <div className="w-full flex justify-between items-center border-b-2 p-2 border-[#515151]">
              <span>Jhon Doe</span>
              <Image
                src={"/user.png"}
                width={32}
                height={32}
                alt="profile"
              />
            </div>
            <div className="text-sm bg-[#662fff] rounded-full m-2 flex">
              <span className="px-2 py-1">Balance: </span>
              <span className="bg-gradient-to-r from-[#662fff]  to-[#9854ff] px-2 rounded-r-full flex items-center">
                $1000.00
              </span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
