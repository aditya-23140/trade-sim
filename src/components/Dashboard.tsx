"use client";
import { useState } from "react";
import TradingView from "./widgets/TradingView";
import CustomBinance from "./widgets/CustomBinance";

const Dashboard = () => {
  const [custom, setCustom] = useState(false);
  return (
    <div className=" h-full w-full rounded-2xl flex max-sm:flex-col gap-2">
      <div className="bg-gradient-to-r relative from-[#6b00b8] to-[#2f0051] h-full w-[70%] max-sm:w-full md:p-8 p-2 rounded-2xl">
        <button
          className="absolute bg-[#000] top-2 rounded-lg p-2 cursor-pointer"
          onClick={() => setCustom((prev) => !prev)}
        >
          {custom ? "Custom View" : "Trading View"}
        </button>
        {custom ? <TradingView /> : <CustomBinance />}
      </div>
      <div className="h-full bg-[#2d2d2d] w-[30%] max-sm:w-full p-8 rounded-2xl"></div>
    </div>
  );
};

export default Dashboard;
