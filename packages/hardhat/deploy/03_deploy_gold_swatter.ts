import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployGoldSwatter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployResult = await deploy("GoldSwatter", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("GoldSwatter deployed to:", deployResult.address);
};

export default deployGoldSwatter;
deployGoldSwatter.tags = ["GoldSwatter"];
