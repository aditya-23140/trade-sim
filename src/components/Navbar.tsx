"use client";
import Image from "next/image";
import Link from "next/link";
import HoverElement from "./smallComponents/HoverElement";
import { useUser } from "@clerk/nextjs";
import { SignedIn } from "@clerk/nextjs";

const NavbarContent = () => {
  const { user } = useUser();

  return (
    <div className="fixed max-md:hidden z-30 h-screen left-0 top-0 py-6 px-2">
      <nav className="flex flex-col justify-between h-full items-center pt-4 pb-2 px-2 bg-[#222222] rounded-full z-50">
        <div className="flex group gap-2 manrope-regular relative">
          <Link href={"/"}>
            <Image src={"/favicon.png"} width={32} height={32} alt="icon" />
          </Link>
          <HoverElement content="Home" />
        </div>
        <ul className="flex flex-col gap-8 text-[#c694ff]">
          <div className="relative flex group gap-2">
            <Link href={"/dashboard"}>
              <Image
                src="/dashboard.png"
                width={32}
                height={32}
                alt="dashboard"
              />
            </Link>
            <HoverElement content="Dashboard" />
          </div>
          <div className="relative flex group gap-2">
            <Link href={"/"}>
              <Image src="/market.png" width={32} height={32} alt="market" />
            </Link>
            <HoverElement content="Market" />
          </div>
          <div className="relative flex group gap-2">
            <Link href={"/"}>
              <Image
                src="/futures-options.png"
                width={32}
                height={32}
                alt="f&o"
              />
            </Link>
            <HoverElement content="F&O" />
          </div>
        </ul>
        <div className="flex flex-col group gap-2 items-center relative">
          <Link href={"/"}>
            <Image
              src={`${user!.imageUrl ? user!.imageUrl : "/profile.png"}`}
              width={32}
              height={32}
              alt="profile"
              className="rounded-full"
            />
          </Link>
          <div
            className="flex-col absolute left-12 bottom-0 backdrop-blur-lg rounded-md hidden group-hover:flex"
            style={{ backgroundColor: "#242424a5" }}
          >
            <div className="flex justify-between items-center border-b-2 p-2 border-[#515151]">
              <span>{user!.fullName}</span>
              <Image
                src={`${user!.imageUrl ? user!.imageUrl : "/user.png"}`}
                width={36}
                height={36}
                alt="profile"
                className="rounded-full"
              />
            </div>
            <div className="text-sm bg-[#662fff] rounded-full m-2 flex">
              <span className="px-2 py-1">Balance: </span>
              <span className="bg-gradient-to-r from-[#662fff]  to-[#9854ff] px-2 rounded-r-full flex items-center">
                $1000.00
              </span>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

const Navbar = () => {
  return (
    <SignedIn>
      <NavbarContent />
    </SignedIn>
  );
};

export default Navbar;
