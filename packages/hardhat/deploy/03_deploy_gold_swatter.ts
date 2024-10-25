import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployGoldSwatter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Add the constructor argument here
  const constructorArg = "Your constructor argument here";

  await deploy("GoldSwatter", {
    from: deployer,
    args: [constructorArg], // Pass the constructor argument in an array
    log: true,
    autoMine: true,
  });
};

export default deployGoldSwatter;
deployGoldSwatter.tags = ["GoldSwatter"];
