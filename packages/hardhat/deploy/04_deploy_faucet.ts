import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFaucet: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("Faucet", {
    from: deployer,
    args: [deployer],
    log: true,
  });
};

export default deployFaucet;
deployFaucet.tags = ["Faucet"];
