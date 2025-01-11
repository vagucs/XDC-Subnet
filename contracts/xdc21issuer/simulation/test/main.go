package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/XinFinOrg/XDC-Subnet/accounts/abi/bind"
	"github.com/XinFinOrg/XDC-Subnet/common"
	"github.com/XinFinOrg/XDC-Subnet/common/hexutil"
	"github.com/XinFinOrg/XDC-Subnet/contracts/xdc21issuer"
	"github.com/XinFinOrg/XDC-Subnet/contracts/xdc21issuer/simulation"
	"github.com/XinFinOrg/XDC-Subnet/ethclient"
)

var (
	xdc21TokenAddr = common.HexToAddress("0x80430A33EaB86890a346bCf64F86CFeAC73287f3")
)

func airDropTokenToAccountNoXDC() {
	client, err := ethclient.Dial(simulation.RpcEndpoint)
	if err != nil {
		fmt.Println(err, client)
	}
	nonce, _ := client.NonceAt(context.Background(), simulation.MainAddr, nil)
	mainAccount := bind.NewKeyedTransactor(simulation.MainKey)
	mainAccount.Nonce = big.NewInt(int64(nonce))
	mainAccount.Value = big.NewInt(0)      // in wei
	mainAccount.GasLimit = uint64(4000000) // in units
	mainAccount.GasPrice = big.NewInt(0).Mul(common.XDC21GasPrice, big.NewInt(2))
	xdc21Instance, _ := xdc21issuer.NewXDC21(mainAccount, xdc21TokenAddr, client)
	xdc21IssuerInstance, _ := xdc21issuer.NewXDC21Issuer(mainAccount, common.XDC21IssuerSMC, client)
	// air drop token
	remainFee, _ := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	tx, err := xdc21Instance.Transfer(simulation.AirdropAddr, simulation.AirDropAmount)
	if err != nil {
		log.Fatal("can't air drop to ", err)
	}
	// check balance after transferAmount
	fmt.Println("wait 10s to airdrop success ", tx.Hash().Hex())
	time.Sleep(10 * time.Second)

	_, receiptRpc, err := client.GetTransactionReceiptResult(context.Background(), tx.Hash())
	receipt := map[string]interface{}{}
	err = json.Unmarshal(receiptRpc, &receipt)
	if err != nil {
		log.Fatal("can't transaction's receipt ", err, "hash", tx.Hash().Hex())
	}
	gasUsed := hexutil.MustDecodeUint64(receipt["gasUsed"].(string))
	blockNumber := hexutil.MustDecodeUint64(receipt["blockNumber"].(string))
	fee := common.GetGasFee(blockNumber, gasUsed)
	fmt.Println("fee", fee.Uint64(), "number", blockNumber)
	remainFee = big.NewInt(0).Sub(remainFee, fee)
	//check balance fee
	balanceIssuerFee, err := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	if err != nil || balanceIssuerFee.Cmp(remainFee) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}
	if err != nil {
		log.Fatal("can't execute transferAmount in tr21:", err)
	}
}
func testTransferXDC21TokenWithAccountNoXDC() {
	client, err := ethclient.Dial(simulation.RpcEndpoint)
	if err != nil {
		fmt.Println(err, client)
	}

	// access to address which received token trc20 but dont have XDC
	nonce, _ := client.NonceAt(context.Background(), simulation.AirdropAddr, nil)
	airDropAccount := bind.NewKeyedTransactor(simulation.AirdropKey)
	airDropAccount.Nonce = big.NewInt(int64(nonce))
	airDropAccount.Value = big.NewInt(0)      // in wei
	airDropAccount.GasLimit = uint64(4000000) // in units
	airDropAccount.GasPrice = big.NewInt(0).Mul(common.XDC21GasPrice, big.NewInt(2))
	xdc21Instance, _ := xdc21issuer.NewXDC21(airDropAccount, xdc21TokenAddr, client)
	xdc21IssuerInstance, _ := xdc21issuer.NewXDC21Issuer(airDropAccount, common.XDC21IssuerSMC, client)

	remainFee, _ := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	airDropBalanceBefore, err := xdc21Instance.BalanceOf(simulation.AirdropAddr)
	receiverBalanceBefore, err := xdc21Instance.BalanceOf(simulation.ReceiverAddr)
	// execute transferAmount trc to other address
	tx, err := xdc21Instance.Transfer(simulation.ReceiverAddr, simulation.TransferAmount)
	if err != nil {
		log.Fatal("can't execute transferAmount in tr21:", err)
	}

	// check balance after transferAmount
	fmt.Println("wait 10s to transferAmount success ")
	time.Sleep(10 * time.Second)

	balance, err := xdc21Instance.BalanceOf(simulation.ReceiverAddr)
	wantedBalance := big.NewInt(0).Add(receiverBalanceBefore, simulation.TransferAmount)
	if err != nil || balance.Cmp(wantedBalance) != 0 {
		log.Fatal("check balance after fail receiverAmount in tr21: ", err, "get", balance, "wanted", wantedBalance)
	}

	remainAirDrop := big.NewInt(0).Sub(airDropBalanceBefore, simulation.TransferAmount)
	remainAirDrop = remainAirDrop.Sub(remainAirDrop, simulation.Fee)
	// check balance xdc21 again
	balance, err = xdc21Instance.BalanceOf(simulation.AirdropAddr)
	if err != nil || balance.Cmp(remainAirDrop) != 0 {
		log.Fatal("check balance after fail transferAmount in tr21: ", err, "get", balance, "wanted", remainAirDrop)
	}
	_, receiptRpc, err := client.GetTransactionReceiptResult(context.Background(), tx.Hash())
	receipt := map[string]interface{}{}
	err = json.Unmarshal(receiptRpc, &receipt)
	if err != nil {
		log.Fatal("can't transaction's receipt ", err, "hash", tx.Hash().Hex())
	}
	gasUsed := hexutil.MustDecodeUint64(receipt["gasUsed"].(string))
	blockNumber := hexutil.MustDecodeUint64(receipt["blockNumber"].(string))
	fee := common.GetGasFee(blockNumber, gasUsed)
	fmt.Println("fee", fee.Uint64(), "number", blockNumber)
	remainFee = big.NewInt(0).Sub(remainFee, fee)
	//check balance fee
	balanceIssuerFee, err := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	if err != nil || balanceIssuerFee.Cmp(remainFee) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}
	//check xdc21 SMC balance
	balance, err = client.BalanceAt(context.Background(), common.XDC21IssuerSMC, nil)
	if err != nil || balance.Cmp(remainFee) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}
}
func testTransferXDC21Fail() {
	client, err := ethclient.Dial(simulation.RpcEndpoint)
	if err != nil {
		fmt.Println(err, client)
	}
	nonce, _ := client.NonceAt(context.Background(), simulation.AirdropAddr, nil)
	airDropAccount := bind.NewKeyedTransactor(simulation.AirdropKey)
	airDropAccount.Nonce = big.NewInt(int64(nonce))
	airDropAccount.Value = big.NewInt(0)      // in wei
	airDropAccount.GasLimit = uint64(4000000) // in units
	airDropAccount.GasPrice = big.NewInt(0).Mul(common.XDC21GasPrice, big.NewInt(2))
	xdc21Instance, _ := xdc21issuer.NewXDC21(airDropAccount, xdc21TokenAddr, client)
	xdc21IssuerInstance, _ := xdc21issuer.NewXDC21Issuer(airDropAccount, common.XDC21IssuerSMC, client)
	balanceIssuerFee, err := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)

	minFee, err := xdc21Instance.MinFee()
	if err != nil {
		log.Fatal("can't get minFee of xdc21 smart contract:", err)
	}
	ownerBalance, err := xdc21Instance.BalanceOf(simulation.MainAddr)
	remainFee, err := xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	airDropBalanceBefore, err := xdc21Instance.BalanceOf(simulation.AirdropAddr)

	tx, err := xdc21Instance.Transfer(common.Address{}, big.NewInt(1))
	if err != nil {
		log.Fatal("can't execute test transfer to zero address in tr21:", err)
	}
	fmt.Println("wait 10s to transfer to zero address")
	time.Sleep(10 * time.Second)

	fmt.Println("airDropBalanceBefore", airDropBalanceBefore)
	// check balance xdc21 again
	airDropBalanceBefore = big.NewInt(0).Sub(airDropBalanceBefore, minFee)
	balance, err := xdc21Instance.BalanceOf(simulation.AirdropAddr)
	if err != nil || balance.Cmp(airDropBalanceBefore) != 0 {
		log.Fatal("check balance after fail transferAmount in tr21: ", err, "get", balance, "wanted", airDropBalanceBefore)
	}

	ownerBalance = big.NewInt(0).Add(ownerBalance, minFee)
	//check balance fee
	balance, err = xdc21Instance.BalanceOf(simulation.MainAddr)
	if err != nil || balance.Cmp(ownerBalance) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}
	_, receiptRpc, err := client.GetTransactionReceiptResult(context.Background(), tx.Hash())
	receipt := map[string]interface{}{}
	err = json.Unmarshal(receiptRpc, &receipt)
	if err != nil {
		log.Fatal("can't transaction's receipt ", err, "hash", tx.Hash().Hex())
	}
	gasUsed := hexutil.MustDecodeUint64(receipt["gasUsed"].(string))
	blockNumber := hexutil.MustDecodeUint64(receipt["blockNumber"].(string))
	fee := common.GetGasFee(blockNumber, gasUsed)
	fmt.Println("fee", fee.Uint64(), "number", blockNumber)
	remainFee = big.NewInt(0).Sub(remainFee, fee)
	//check balance fee
	balanceIssuerFee, err = xdc21IssuerInstance.GetTokenCapacity(xdc21TokenAddr)
	if err != nil || balanceIssuerFee.Cmp(remainFee) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}
	//check xdc21 SMC balance
	balance, err = client.BalanceAt(context.Background(), common.XDC21IssuerSMC, nil)
	if err != nil || balance.Cmp(remainFee) != 0 {
		log.Fatal("can't get balance token fee in  smart contract: ", err, "got", balanceIssuerFee, "wanted", remainFee)
	}

}
func main() {
	fmt.Println("========================")
	fmt.Println("airdropAddr", simulation.AirdropAddr.Hex())
	fmt.Println("receiverAddr", simulation.ReceiverAddr.Hex())
	fmt.Println("========================")

	start := time.Now()
	for i := 0; i < 10000000; i++ {
		airDropTokenToAccountNoXDC()
		fmt.Println("Finish airdrop token to a account")
		testTransferXDC21TokenWithAccountNoXDC()
		fmt.Println("Finish transfer xdc21 token with a account no XDC")
		testTransferXDC21Fail()
		fmt.Println("Finish testing ! Success transferAmount token trc20 with a account no XDC")
	}
	fmt.Println(common.PrettyDuration(time.Since(start)))
}
