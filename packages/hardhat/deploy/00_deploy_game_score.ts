import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Ensure compilation before deployment
  await hre.run('compile');

  await deploy("GameScore", {
    from: deployer,
    args: [], // Add constructor arguments here if any
    log: true,
  });
};

export default func;
func.tags = ["GameScore"];
