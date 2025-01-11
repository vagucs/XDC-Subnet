
pragma solidity ^0.4.21;

import "./libraries/SafeMath.sol";

contract C9ChainValidator {
    using SafeMath for uint256;

    event Vote(address _voter, address _candidate, uint256 _cap);
    event Unvote(address _voter, address _candidate, uint256 _cap);
    event Propose(address _owner, address _candidate, uint256 _cap);
    event Resign(address _owner, address _candidate);
    event Withdraw(address _owner, uint256 _blockNumber, uint256 _cap);
    event UploadedKYC(address _owner,string kycHash);
    event InvalidatedNode(address _masternodeOwner, address[] _masternodes);

    struct ValidatorState {
        address owner;
        bool isCandidate;
        uint256 cap;
        mapping(address => uint256) voters;
    }

    struct WithdrawState {
      mapping(uint256 => uint256) caps;
      uint256[] blockNumbers;
    }

    mapping(address => WithdrawState) withdrawsState;

    mapping(address => ValidatorState) validatorsState;
    mapping(address => address[]) voters;

    // Mapping structures added for KYC feature.
    mapping(address => string[]) public KYCString;
    mapping(address => uint) public invalidKYCCount;
    mapping(address => mapping(address => bool)) public hasVotedInvalid;
    mapping(address => address[]) public ownerToCandidate;
    address[] public owners;

    address[] public candidates;
    address public _ownerIssuer;

    uint256 public candidateCount = 0;
    uint256 public ownerCount = 0;
    uint256 public minCandidateCap;
    uint256 public minVoterCap;
    uint256 public maxValidatorNumber;
    uint256 public candidateWithdrawDelay;
    uint256 public voterWithdrawDelay;

    modifier onlyValidCandidateCap {
        // anyone can deposit X XDC to become a candidate
        require(msg.value >= minCandidateCap,"Invalid candidate");
        _;
    }

    modifier onlyValidVoterCap {
        require(msg.value >= minVoterCap,"Insufficient funds to vote");
        _;
    }

    modifier onlyKYCWhitelisted {
       require(KYCString[msg.sender].length!=0 || ownerToCandidate[msg.sender].length>0,"KYC is not whitelisted");
       _;
    }

    modifier onlyOwner(address _candidate) {
        require(validatorsState[_candidate].owner == msg.sender,"Not a valid owner");
        _;
    }

    modifier onlyCandidate(address _candidate) {
        require(validatorsState[_candidate].isCandidate,"Not a candidate yet");
        _;
    }

    modifier onlyValidCandidate (address _candidate) {
        require(validatorsState[_candidate].isCandidate,"Not a valid candidate");
        _;
    }

    modifier onlyIssuer() {
        require(msg.sender == _ownerIssuer,"Not the creator of the contract");
        _;
    }

    modifier onlyNotCandidate (address _candidate) {
        require(!validatorsState[_candidate].isCandidate,"Non-candidates only");
        _;
    }

    modifier onlyValidVote (address _candidate, uint256 _cap) {
        require(validatorsState[_candidate].voters[msg.sender] >= _cap,"Invalid voter");
        if (validatorsState[_candidate].owner == msg.sender) {
            require(validatorsState[_candidate].voters[msg.sender].sub(_cap) >= minCandidateCap,"Insufficient minimum voting funds.");
        }
        _;
    }

    // Pre-valida o saque
    modifier onlyValidWithdraw (uint256 _blockNumber, uint _index) {
        require(_blockNumber > 0,"Block number is not zero");
        require(block.number >= _blockNumber,"Wait block not reached");
        require(withdrawsState[msg.sender].caps[_blockNumber] > 0,"Wait block not reached(2)");
        require(withdrawsState[msg.sender].blockNumbers[_index] == _blockNumber,"Block number in withdrawstate not equal");
        _;
    }

    // Muda o valor minimo que o candidato deve pagar para se tornar um nó
    function SetMinCandidateCap(uint256 _minCandidateCap) 
    external 
    onlyIssuer() {
        minCandidateCap = _minCandidateCap;
    }

    // Muda o valor minimo de moedas que um votante precisa ter para efetivar seu voto.
    function SetMinVoterCap(uint256 _minVoterCap) 
    external 
    onlyIssuer() {
        minVoterCap = _minVoterCap;
    }

    // Auementa quantidade de validadores da rede ou diminui
    function SetMaxValidatorNumber(uint256 _maxValidatorNumber) 
    external 
    onlyIssuer() {
        maxValidatorNumber = _maxValidatorNumber;
    }


    // Auementa quantidade de validadores da rede ou diminui
    function SetVoterWithdrawDelay(uint256 _voterWithdrawDelay) 
    external 
    onlyIssuer() {
        voterWithdrawDelay = _voterWithdrawDelay;
    }


    // Auementa quantidade de validadores da rede ou diminui
    function SetCandidateWithdrawDelay(uint256 _candidateWithdrawDelay) 
    external 
    onlyIssuer() {
        candidateWithdrawDelay = _candidateWithdrawDelay;
    }

    // Retornar o valor atual para se tornar um candidato
    function getMinCapForMasterNode() public view returns(uint256) 
    {
        return minCandidateCap;
    }
    /*

    400.000 * 200 = 80.000.000
    250000000

    _candidates = ["0x1b64038A2b1DB73ABd0068d8B9B0d1dC5a90C5F1","0x9df57d1c638c46c3e84122ea777fc023b3f44c7d"]
    _caps = [200000000000000000000000,200000000000000000000000] (200.000)
    _firstOwner = 0x1b64038A2b1DB73ABd0068d8B9B0d1dC5a90C5F1
    _minCandidateCap = 200000000000000000000000 (200.000)
    _minVoterCap = 50000000000000000000000 (50.000)
    _maxValidatorNumber = 200
    _candidateWithdrawDelay = 1296000 - 30 para saque dos fundos
    _voterWithdrawDelay = 432000 -> 10 Dias de espera para votação
    */
    constructor (
        address[] parcandidates,
        uint256[] parcaps,
        address parfirstOwner,
        uint256 parminCandidateCap,
        uint256 parminVoterCap,
        uint256 parmaxValidatorNumber,
        uint256 parcandidateWithdrawDelay,
        uint256 parvoterWithdrawDelay
    ) public {
        minCandidateCap = parminCandidateCap;
        minVoterCap = parminVoterCap;
        maxValidatorNumber = parmaxValidatorNumber;
        candidateWithdrawDelay = parcandidateWithdrawDelay;
        voterWithdrawDelay = parvoterWithdrawDelay;
        candidateCount = parcandidates.length;
        owners.push(parfirstOwner);
        ownerCount++;
        _ownerIssuer = parfirstOwner; //msg.sender;
        for (uint256 i = 0; i < parcandidates.length; i++) {
            candidates.push(parcandidates[i]);
            validatorsState[parcandidates[i]] = ValidatorState({
                owner: parfirstOwner,
                isCandidate: true,
                cap: parcaps[i]
            });
            voters[parcandidates[i]].push(parfirstOwner);
            ownerToCandidate[parfirstOwner].push(parcandidates[i]);
            validatorsState[parcandidates[i]].voters[parfirstOwner] = minCandidateCap;
        }
    }

    // uploadKYC : anyone can upload a KYC; its not equivalent to becoming an owner.
    function uploadKYC(string kychash) external {
        KYCString[msg.sender].push(kychash);
        emit UploadedKYC(msg.sender,kychash);
    }

    // propose : qualqer não candidato que tenha feito upload de seu KYC pode se propor a ser um candidato
    function propose(address _candidate) external payable 
        onlyValidCandidateCap 
        onlyKYCWhitelisted 
        onlyNotCandidate(_candidate) {
        uint256 cap = validatorsState[_candidate].cap.add(msg.value);
        candidates.push(_candidate);
        validatorsState[_candidate] = ValidatorState({
            owner: msg.sender,
            isCandidate: true,
            cap: cap
        });
        validatorsState[_candidate].voters[msg.sender] = validatorsState[_candidate].voters[msg.sender].add(msg.value);
        candidateCount = candidateCount.add(1);
        if (ownerToCandidate[msg.sender].length ==0){
            owners.push(msg.sender);
            ownerCount++;
        }
        ownerToCandidate[msg.sender].push(_candidate);
        voters[_candidate].push(msg.sender);
        emit Propose(msg.sender, _candidate, msg.value);
    }

    function vote(address _candidate) external payable onlyValidVoterCap onlyValidCandidate(_candidate) {
        validatorsState[_candidate].cap = validatorsState[_candidate].cap.add(msg.value);
        if (validatorsState[_candidate].voters[msg.sender] == 0) {
            voters[_candidate].push(msg.sender);
        }
        validatorsState[_candidate].voters[msg.sender] = validatorsState[_candidate].voters[msg.sender].add(msg.value);
        emit Vote(msg.sender, _candidate, msg.value);
    }

    function getCandidates() public view returns(address[]) {
        return candidates;
    }

    function getCandidateCap(address _candidate) public view returns(uint256) {
        return validatorsState[_candidate].cap;
    }

    function getCandidateOwner(address _candidate) public view returns(address) {
        return validatorsState[_candidate].owner;
    }

    function getVoterCap(address _candidate, address _voter) public view returns(uint256) {
        return validatorsState[_candidate].voters[_voter];
    }

    function getVoters(address _candidate) public view returns(address[]) {
        return voters[_candidate];
    }

    function isCandidate(address _candidate) public view returns(bool) {
        return validatorsState[_candidate].isCandidate;
    }

    function getWithdrawBlockNumbers() public view returns(uint256[]) {
        return withdrawsState[msg.sender].blockNumbers;
    }

    function getWithdrawCap(uint256 _blockNumber) public view returns(uint256) {
        return withdrawsState[msg.sender].caps[_blockNumber];
    }

    function unvote(address _candidate, uint256 _cap) public onlyValidVote(_candidate, _cap) {
        validatorsState[_candidate].cap = validatorsState[_candidate].cap.sub(_cap);
        validatorsState[_candidate].voters[msg.sender] = validatorsState[_candidate].voters[msg.sender].sub(_cap);

        // refund after delay X blocks
        uint256 withdrawBlockNumber = voterWithdrawDelay.add(block.number);
        withdrawsState[msg.sender].caps[withdrawBlockNumber] = withdrawsState[msg.sender].caps[withdrawBlockNumber].add(_cap);
        withdrawsState[msg.sender].blockNumbers.push(withdrawBlockNumber);

        emit Unvote(msg.sender, _candidate, _cap);
    }

    function resign(address _candidate) public onlyOwner(_candidate) onlyCandidate(_candidate) {
        validatorsState[_candidate].isCandidate = false;
        candidateCount = candidateCount.sub(1);
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i] == _candidate) {
                delete candidates[i];
                break;
            }
        }
        uint256 cap = validatorsState[_candidate].voters[msg.sender];
        validatorsState[_candidate].cap = validatorsState[_candidate].cap.sub(cap);
        validatorsState[_candidate].voters[msg.sender] = 0;
        // refunding after resigning X blocks
        uint256 withdrawBlockNumber = candidateWithdrawDelay.add(block.number);
        withdrawsState[msg.sender].caps[withdrawBlockNumber] = withdrawsState[msg.sender].caps[withdrawBlockNumber].add(cap);
        withdrawsState[msg.sender].blockNumbers.push(withdrawBlockNumber);
        emit Resign(msg.sender, _candidate);
    }

    // voteInvalidKYC : any candidate can vote for invalid KYC i.e. a particular candidate's owner has uploaded a bad KYC.
    // On securing 75% votes against an owner ( not candidate ), owner & all its candidates will lose their funds.
    function voteInvalidKYC(address _invalidCandidate) onlyValidCandidate(msg.sender) onlyValidCandidate(_invalidCandidate) public {
        address candidateOwner = getCandidateOwner(msg.sender);
        address _invalidMasternode = getCandidateOwner(_invalidCandidate);
        require(!hasVotedInvalid[candidateOwner][_invalidMasternode]);
        hasVotedInvalid[candidateOwner][_invalidMasternode] = true;
        invalidKYCCount[_invalidMasternode] += 1;
        if( invalidKYCCount[_invalidMasternode]*100/getOwnerCount() >= 75 ){
            // 75% owners say that the KYC is invalid
            address[] memory allMasternodes = new address[](candidates.length-1) ;
            uint count=0;
            for (uint i=0;i<candidates.length;i++){
                if (getCandidateOwner(candidates[i])==_invalidMasternode){
                    // logic to remove cap.
                    candidateCount = candidateCount.sub(1);
                    allMasternodes[count++] = candidates[i];
                    delete candidates[i];
                    delete validatorsState[candidates[i]];
                    delete KYCString[_invalidMasternode];
                    delete ownerToCandidate[_invalidMasternode];
                    delete invalidKYCCount[_invalidMasternode];
                }
            }
            for(uint k=0;k<owners.length;k++){
                        if (owners[k]==_invalidMasternode){
                            delete owners[k];
                            ownerCount--;
                            break;
                } 
            }
            emit InvalidatedNode(_invalidMasternode,allMasternodes);
        }
    }

    // invalidPercent : get votes against an owner in percentage.
    function invalidPercent(address _invalidCandidate) onlyValidCandidate(_invalidCandidate) view public returns(uint){
        address _invalidMasternode = getCandidateOwner(_invalidCandidate);
        return (invalidKYCCount[_invalidMasternode]*100/getOwnerCount());
    }


    // getOwnerCount : get count of total owners; accounts who own atleast one masternode.
    function getOwnerCount() view public returns (uint){
        return ownerCount;
    }
    
    // getKYC : get KYC uploaded of the owner of the given masternode or the owner themselves
    function getLatestKYC(address _address) view public  returns (string) {
        if(isCandidate(_address)){
        return KYCString[getCandidateOwner(_address)][KYCString[getCandidateOwner(_address)].length-1];
        }
        else{
            return KYCString[_address][KYCString[_address].length-1];
        }
    }
    
    function getHashCount(address _address) view public returns(uint){
        return KYCString[_address].length;
    }

    function withdraw(uint256 _blockNumber, uint _index) public onlyValidWithdraw(_blockNumber, _index) {
        uint256 cap = withdrawsState[msg.sender].caps[_blockNumber];
        delete withdrawsState[msg.sender].caps[_blockNumber];
        delete withdrawsState[msg.sender].blockNumbers[_index];
        msg.sender.transfer(cap);
        emit Withdraw(msg.sender, _blockNumber, cap);
    }
}
