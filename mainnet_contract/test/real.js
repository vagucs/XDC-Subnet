const RLP = require("rlp");
const util = require("@ethereumjs/util");
const secp256k1 = require("secp256k1");
const HeaderReader = artifacts.require("HeaderReader");
const Subnet = artifacts.require("Subnet");

const hex2Arr = (hexString) => {
  if (hexString.length % 2 !== 0) {
      throw "Must have an even number of hex digits to convert to bytes";
  }
  var numBytes = hexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i=0; i<numBytes; i++) {
      byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
  }
  return byteArray;
}

contract("Subnet Real Sample Test", async accounts => {
  beforeEach(async () => {
    this.validators_addr = [
      "0x888c073313b36cf03CF1f739f39443551Ff12bbE",
      "0x5058dfE24Ef6b537b5bC47116A45F0428DA182fA",
      "0xefEA93e384a6ccAaf28E33790a2D1b2625BF964d"
    ];
    

    this.genesis_encoded = "0xf90297a00000000000000000000000000000000000000000000000000000000000000000a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347940000000000000000000000000000000000000000a01440fad03eee4dc813445582d29593d336c6ee51c608a997827a4b2d75cf05f7a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b901000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001808347b760808463d8bdebb89d00000000000000000000000000000000000000000000000000000000000000005058dfe24ef6b537b5bc47116a45f0428da182fa888c073313b36cf03cf1f739f39443551ff12bbeefea93e384a6ccaaf28e33790a2d1b2625bf964d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c280808080";
    this.genesis_hash = web3.utils.sha3(Buffer.from(hex2Arr(this.genesis_encoded.slice(2)))).toString("hex");
    this.block1_encoded = "0xf902a6a02deae4c8bb069b27d012a5b35ea9f80a557186c9a9b3272dd0624f3f2d4d0ce5a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794efea93e384a6ccaaf28e33790a2d1b2625bf964da0391364838a922acf944686ad94f3f8cc2189302ae085be123e72ec6550aaa990a0f56fb69db371169b9007d863f48c82e60f28e40b64657d87da08629c362716b8a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101841908b10082630884642ba0ccaa02e802e6e3a02deae4c8bb069b27d012a5b35ea9f80a557186c9a9b3272dd0624f3f2d4d0ce58080c080a00000000000000000000000000000000000000000000000000000000000000000880000000000000000f83fb83c5058dfe24ef6b537b5bc47116a45f0428da182fa888c073313b36cf03cf1f739f39443551ff12bbeefea93e384a6ccaaf28e33790a2d1b2625bf964d80b841dd2410841bdc407e34d9ceff8bc8037513e78530d23017beb7f9b49d87b2bf8407423f7ee932e9579c2da82c84d17aed8ae9e0ecfab8042be6042b6faa4168fb0080"
    this.block1_hash = web3.utils.sha3(Buffer.from(hex2Arr(this.block1_encoded.slice(2)))).toString("hex");

    this.lib = await HeaderReader.new();
    Subnet.link("HeaderReader", this.lib.address);
    this.subnet = await Subnet.new(
      this.validators_addr,
      2,
      this.genesis_encoded,
      this.block1_encoded,
      450,
      900,
      {"from": accounts[0]}
    );
  })

  // it("Receive New Header", async() => {

  //   const block2_encoded = "0xf902f2a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef968a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347945058dfe24ef6b537b5bc47116a45f0428da182faa077d2428369607f44b7c268b74a3a5ebafe3d1daa196eaec6ed41ec8abe07cebea007cdad4520ece7e258340b120f9bca2d3862df97b6b88bc4ab70142e82d60c21a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000102841908b10082630884642ba0ceb8b302f8b003f8ade3a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef9680201f886b841234e1664861067b7012df607b26e343498c02e89cde31820577327ae9d298c7a7f255cae616eecb4313a6f31af8a6008e6c5ab983d9c45a537f80b33080e66d701b84132545028dd77a5edcf1199c0e2bac90d57018df08d4f0ab6395a5b2b6a83d0cc5e74a6fac1155e38c330bdcaef196738240d3e7e0392f4e116b328a0d30685c70180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b84186b71e3a3b37f7e527e18fa97c6804defe092b7ff2ac8abc5cafdd6ffdf74fcc30fa8b6cc4cc3c78ef3d80319452902c6dfc0d02c291be9a8aef468d9fd15fcc0180";
  //   const block2_hash = web3.utils.sha3(Buffer.from(hex2Arr(block2_encoded.slice(2)))).toString("hex");
  //   await this.subnet.receiveHeader([block2_encoded]);

  //   const finalized = await this.subnet.getHeaderConfirmationStatus(block2_hash);
  //   const latest_blocks = await this.subnet.getLatestBlocks();
  //   assert.equal(finalized, false);
  //   assert.equal(latest_blocks["0"][0], block2_hash);
  //   assert.equal(latest_blocks["1"][0], this.block1_hash);
  // });

  it("Receive New Header", async() => {

    const block2_encoded = "0xf902f2a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef968a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347945058dfe24ef6b537b5bc47116a45f0428da182faa077d2428369607f44b7c268b74a3a5ebafe3d1daa196eaec6ed41ec8abe07cebea007cdad4520ece7e258340b120f9bca2d3862df97b6b88bc4ab70142e82d60c21a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000102841908b10082630884642ba0ceb8b302f8b003f8ade3a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef9680201f886b841234e1664861067b7012df607b26e343498c02e89cde31820577327ae9d298c7a7f255cae616eecb4313a6f31af8a6008e6c5ab983d9c45a537f80b33080e66d701b84132545028dd77a5edcf1199c0e2bac90d57018df08d4f0ab6395a5b2b6a83d0cc5e74a6fac1155e38c330bdcaef196738240d3e7e0392f4e116b328a0d30685c70180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b84186b71e3a3b37f7e527e18fa97c6804defe092b7ff2ac8abc5cafdd6ffdf74fcc30fa8b6cc4cc3c78ef3d80319452902c6dfc0d02c291be9a8aef468d9fd15fcc0180";
    console.log(await this.lib.test(block2_encoded));
  });

  // it("Confirm A Received Block", async() => {

  //   const block2_encoded = "0xf902f2a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef968a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347945058dfe24ef6b537b5bc47116a45f0428da182faa077d2428369607f44b7c268b74a3a5ebafe3d1daa196eaec6ed41ec8abe07cebea007cdad4520ece7e258340b120f9bca2d3862df97b6b88bc4ab70142e82d60c21a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000102841908b10082630884642ba0ceb8b302f8b003f8ade3a018541150752433767e423be616750ed2692d990375c4ecf2d710a38f839ef9680201f886b841234e1664861067b7012df607b26e343498c02e89cde31820577327ae9d298c7a7f255cae616eecb4313a6f31af8a6008e6c5ab983d9c45a537f80b33080e66d701b84132545028dd77a5edcf1199c0e2bac90d57018df08d4f0ab6395a5b2b6a83d0cc5e74a6fac1155e38c330bdcaef196738240d3e7e0392f4e116b328a0d30685c70180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b84186b71e3a3b37f7e527e18fa97c6804defe092b7ff2ac8abc5cafdd6ffdf74fcc30fa8b6cc4cc3c78ef3d80319452902c6dfc0d02c291be9a8aef468d9fd15fcc0180";
  //   const block2_hash = web3.utils.sha3(Buffer.from(hex2Arr(block2_encoded.slice(2)))).toString("hex");
  //   const block3_encoded = "0xf90335a0ff2448ffae91cfdb2e2dc76c9a731c54c83bf461abb33a39678b16f1404da9e6a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794888c073313b36cf03cf1f739f39443551ff12bbea0b08c9351c5ff29abadc0870a89431682e697c2ca4eed924c3d9e47607d528e5ca03497c4c3e6e37f88b6596fd7964f526e62a0f05b615f0e040b4cf720c7a40f6da037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000103841908b10082630884642ba0d0b8f602f8f304f8f0e3a0ff2448ffae91cfdb2e2dc76c9a731c54c83bf461abb33a39678b16f1404da9e60302f8c9b84135185077fc93de3783c33dde394ec0b9ec47b56114cf73a18b12c41cd2f39a30254e7a18571b1e1358692b3c946ff849da5a8d04c06416185041bd38d3cdd89b00b841a1c279b402f9f314ff7360577ad1946dd8afd4c60b9769af298548550c69634c035b212adde4b558945bd54cfcc1b8c7a38e931db3a21cf06a6ae18484da5a9700b841ee0ed322e50f0b2e9b3ad9eccc25347598c9b4e1afdf7486ded6055cdb49378e2c9559ecfd4efd0a4379257cc3c9123fa4dd574e1b742286ccdac2f93fa7d61c0180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b84122eb0940a12a7df5518e20d21584adc5973772e95ac4be3a200b94437b29609c415f3fc9fa4f22e2aa45c430c6f753352d94e55527ea6674974361ee124a24e30180";
  //   const block4_encoded = "0xf90335a05117552c095a7e20f037c6e3e015ee98642cf201759456299cdc5309a521739ca01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794efea93e384a6ccaaf28e33790a2d1b2625bf964da0836b89f0d33d369e589fe727603a24efc847126942544d6da179d958c6c727b0a0313cb0bd8b9b9dc3de51e6a8de47e5fae7037d137430714611170da807502382a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000104841908b10082630884642ba0d2b8f602f8f305f8f0e3a05117552c095a7e20f037c6e3e015ee98642cf201759456299cdc5309a521739c0403f8c9b841185997bb674d188be711b1acb7bd8f4c666e1a7e23a8d7782bb7888d7581a0a049335898016ee64abaec6252222775d367ab55a2e07611b5fa98c52767f3126201b8416a4d790f0040404ac5a2f23cfbf90db6687d538a113c2d93c3bd3e3922d136110eed30f23b1109252be8c74bedc5138c4b95327bc323c86955cf03fca980db1701b841969b67101f6598acaefef780b071e97ee60871a37e28934a224dd571caaa57cc385238bbc61537eab2dc584fff732e665be64b39eb2f002154aa26bd98a242a80180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b841dd1e3065a5127952df52eb8abcd95b390b8533d5eae85390ffb56a30b4ef4936798ba84d7c247741f1108ecd3afc36cef58832836aaafd0c0a003e833e92d9ef0080";
  //   const block5_encoded = "0xf90335a09be801adc5965392b0033c4ec963cfadca756bdac1ddbfb30298dadefdf3f91ba01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347945058dfe24ef6b537b5bc47116a45f0428da182faa0fa116454c543256a2eb2aef53460c09ea3aa7af9bfd7ccbb15f2167e7c612082a0420e59f747a344ae21e927a03d3073691d88b750b4de78439fceb4a1ef5d8088a037677206c85d7bf905a2f29d9380c65c8d6f7231b1c5a36cb628bc5ccc0fe4d0b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000105841908b10082630884642ba0d4b8f602f8f306f8f0e3a09be801adc5965392b0033c4ec963cfadca756bdac1ddbfb30298dadefdf3f91b0504f8c9b84163a4419076bf3ca622401e6ef15b8fed934ccfeb82fe3578b9c79192fab10d7f5af70a0d17a86e0b1c19ea203692959512e0aa9330fd019e632beb7413a8dc0401b841875bcc704f6610aeaa78c4a7e6ff3288fc937970ed063381157cb972c7112a1b3a1751d3c51b006683a46cecd6ec9df1c986867a99d73be738ebe3436eb1bd3700b841ff7abefcb0868ea1434368f4064c483e9e39cc3fa3d014326e9908fab38657f457f15b0da196fa30fa8ce8449c24d8c19d48a7672f0b8e2fc9d90f3294e2d87d0180a00000000000000000000000000000000000000000000000000000000000000000880000000000000000c28080b84149e39e9dadb5ad865f33ab471b6756eb419bc7ae997441e3d0c9d7729bafab8d3a7b1be06bf040833dfd33a559a1b94250dfd12c45c923f884ee6565cd4bab2b0180";
  //   const block5_hash = web3.utils.sha3(Buffer.from(hex2Arr(block5_encoded.slice(2)))).toString("hex");

  //   await this.subnet.receiveHeader([block2_encoded, block3_encoded]);
  //   await this.subnet.receiveHeader([block4_encoded, block5_encoded]);

  //   const finalized = await this.subnet.getHeaderConfirmationStatus(block2_hash);
  //   const latest_blocks = await this.subnet.getLatestBlocks();
  //   assert.equal(finalized, true);
  //   assert.equal(latest_blocks["0"][0], block5_hash);
  //   assert.equal(latest_blocks["1"][0], block2_hash);

  // });


});