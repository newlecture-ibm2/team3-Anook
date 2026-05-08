package com.anook.backend.fb.application.port.out;

public interface ReceiptSubmitPort {
    void submitReceipt(String roomNo, Long menuId, int quantity, int totalPrice);
}
