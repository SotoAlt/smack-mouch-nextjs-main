import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const constructorArg = "0x41f3C185123a4519f30eE1507cfd146e85a59a22";

  // Ensure compilation before deployment
  await hre.run("compile");

  await deploy("MouchDrops", {
    from: deployer,
    args: [constructorArg], // Add constructor arguments here if any
    log: true,
  });
};

export default func;
func.tags = ["MouchDrops"];
