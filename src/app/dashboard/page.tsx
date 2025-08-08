import Dashboard from "@/components/Dashboard";
import React from "react";

const Page = () => {
  return (
    <>
      <main className="h-screen w-full pl-18 pr-4 py-8">
        <Dashboard />
      </main>
      <div className="h-screen w-full pl-18 pr-4 py-8">
        <div className="bg-amber-400  w-full h-full rounded-2xl"></div>
      </div>
    </>
  );
};

export default Page;
