import { Transfer as TransferEvent } from '../generated/USDC/USDC'
import { Transfer } from '../generated/schema'

export function handleTransfer(event: TransferEvent): void {
  // Specify the target address to monitor (replace with your address)
  let targetAddress = "0xYourTargetAddress1234567890abcdef1234567890abcdef".toLowerCase() // Replace with your target address

  // Convert addresses to lowercase for comparison
  let toAddress = event.params.to.toHex().toLowerCase()

  // Filter transfers to the target address
  if (toAddress == targetAddress) {
    let transfer = new Transfer(event.transaction.hash.toHex())

    transfer.from = event.params.from
    transfer.to = event.params.to
    transfer.value = event.params.value
    transfer.timestamp = event.block.timestamp
    transfer.blockNumber = event.block.number
    transfer.transactionHash = event.transaction.hash

    transfer.save()
  }
}
