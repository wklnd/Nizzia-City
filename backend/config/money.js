const money = require("../data/money.json");

const TRANSFER_FEE_RATE = money.transferFeeRate;
const TRANSFER_DAILY_CAP = money.transferDailyCap;
const TRANSFER_MIN = money.transferMin;
const TRANSACTION_PAGE_SIZE = money.transactionPageSize;

module.exports = {
  TRANSFER_FEE_RATE,
  TRANSFER_DAILY_CAP,
  TRANSFER_MIN,
  TRANSACTION_PAGE_SIZE,
};