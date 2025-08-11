import React from "react";
import TradingView from "./widgets/TradingView";
import CustomBinance from "./widgets/CustomBinance";

const Dashboard = () => {
  return (
    <div className=" h-full w-full rounded-2xl flex max-sm:flex-col gap-2">
      <div className="bg-gradient-to-r from-[#6b00b8] to-[#2f0051] h-full w-[70%] max-sm:w-full md:p-8 p-2 rounded-2xl">
        {/* <TradingView /> */}
        <CustomBinance />
      </div>
      <div className="h-full bg-[#2d2d2d] w-[30%] max-sm:w-full p-8 rounded-2xl"></div>
    </div>
  );
};

export default Dashboard;
