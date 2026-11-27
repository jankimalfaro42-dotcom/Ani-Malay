import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/notify";
import "../App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://ani-malay-production.up.railway.app";

const trackingSteps = [
  {
    status: "pending",
    title: "Order Placed",
    description: "Waiting for LGU confirmation.",
  },
  {
    status: "confirmed",
    title: "Order Confirmed",
    description: "The LGU has confirmed your order.",
  },
  {
    status: "processing",
    title: "Preparing Your Order",
    description: "Your products are being prepared.",
  },
  {
    status: "ready",
    title: "Ready for Delivery",
    description: "Your order is ready for dispatch.",
  },
  {
    status: "out_for_delivery",
    title: "Out for Delivery",
    description: "Your order is on its way.",
  },
  {
    status: "completed",
    title: "Order Completed",
    description: "Your order has been completed.",
  },
];

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function getCurrentUserId(token) {
  try {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const idFromUser =
        parsedUser?.user_id ?? parsedUser?.id ?? parsedUser?.user?.user_id;
      if (idFromUser) {
        return Number(idFromUser);
      }
    }
  } catch {
    // Fallback to JWT token below
  }

  const payload = decodeJwtPayload(token);
  const idFromToken = payload?.user_id ?? payload?.id ?? payload?.sub;
  return idFromToken ? Number(idFromToken) : null;
}

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(null);

  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const token = localStorage.getItem("token");

  const fetchOrdersList = useCallback(async () => {
    setErrorMessage("");
    const activeUserId = getCurrentUserId(token);

    if (!activeUserId) {
      setOrders([]);
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/orders?user_id=${encodeURIComponent(activeUserId)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load orders");
    }

    const data = await response.json();
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
        ? data.orders
        : [];

    setOrders(list);
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        await fetchOrdersList();
      } catch (error) {
        console.error("Failed to load orders:", error);
        if (isMounted) {
          setErrorMessage("Unable to load your orders right now.");
          setOrders([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [fetchOrdersList]);

  const viewOrder = async (orderId) => {
    if (selectedOrder?.order?.order_id === orderId) {
      setSelectedOrder(null);
      return;
    }

    try {
      setDetailsLoading(orderId);
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error("Failed to load order details");
      }
      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error("Failed to load order details:", error);
      notify(
        "error",
        "Error",
        "Failed to load order details. Please try again."
      );
    } finally {
      setDetailsLoading(null);
    }
  };

  const canCancelOrder = (order) => {
    const currentStatus = String(
      order?.status || order?.order_status || "pending"
    ).toLowerCase();
    return currentStatus === "pending";
  };

  const openCancelModal = (order) => {
    if (!order?.order_id || cancellingOrderId) return;
    setOrderToCancel(order);
  };

  const closeCancelModal = () => {
    if (cancellingOrderId) return;
    setOrderToCancel(null);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel?.order_id || cancellingOrderId) return;

    const targetOrder = orderToCancel;
    const formattedId = `#AM-${String(targetOrder.order_id).padStart(4, "0")}`;

    setCancellingOrderId(targetOrder.order_id);

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let response = await fetch(
        `${API_BASE_URL}/api/orders/${targetOrder.order_id}/cancel`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            status: "cancelled",
            reason: "Cancelled by consumer",
          }),
        }
      );

      if (response.status === 404 || response.status === 405) {
        response = await fetch(
          `${API_BASE_URL}/api/orders/${targetOrder.order_id}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status: "cancelled" }),
          }
        );
      }

      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to cancel this order.");
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.order_id === targetOrder.order_id
            ? { ...item, status: "cancelled" }
            : item
        )
      );

      if (selectedOrder?.order?.order_id === targetOrder.order_id) {
        setSelectedOrder((prev) => ({
          ...prev,
          order: { ...prev.order, status: "cancelled" },
        }));
      }

      setOrderToCancel(null);

      notify(
        "success",
        "Order Cancelled",
        `Order ${formattedId} has been cancelled.`
      );
    } catch (error) {
      console.error("Cancel order error:", error);
      notify(
        "error",
        "Cancellation Failed",
        error.message ||
          "Could not cancel order. Check if your backend supports order cancellation."
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getReferenceNumber = (order) =>
    order?.gcash_reference_number ||
    order?.reference_number ||
    order?.shipping_reference_number ||
    order?.payment_reference ||
    "";

  const getReceiptSrc = (order) => {
    const rawReceipt =
      order?.receipt_image ||
      order?.shipping_receipt ||
      order?.payment_receipt ||
      order?.gcash_receipt ||
      "";

    if (!rawReceipt) return "";
    if (
      rawReceipt.startsWith("http://") ||
      rawReceipt.startsWith("https://") ||
      rawReceipt.startsWith("data:")
    ) {
      return rawReceipt;
    }
    return rawReceipt.startsWith("/")
      ? `${API_BASE_URL}${rawReceipt}`
      : `${API_BASE_URL}/${rawReceipt}`;
  };

  const formatMoney = (amount) => `₱${Number(amount || 0).toFixed(2)}`;

  const formatStatus = (status) =>
    status
      ? status
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Pending";

  const renderTracking = (status) => {
    if (status === "cancelled") {
      return (
        <div className="tracking-cancelled">
          <p>
            <strong>Order Cancelled</strong>
          </p>
          <p>This order has been cancelled.</p>
        </div>
      );
    }

    const currentIndex = trackingSteps.findIndex(
      (step) => step.status === status
    );
    return (
      <div className="order-tracking">
        <h4>Order Tracking</h4>
        <p className="tracking-current-status">
          Current Status: {formatStatus(status)}
        </p>
        <div className="tracking-timeline">
          {trackingSteps.map((step, index) => {
            const isComplete = currentIndex >= 0 && index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <div
                className={`tracking-step ${
                  isComplete ? "is-complete" : ""
                } ${isCurrent ? "is-current" : ""}`}
                key={step.status}
              >
                <div className="tracking-marker">
                  {isComplete ? "✓" : index + 1}
                </div>
                <div className="tracking-step-content">
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  {isCurrent && (
                    <span className="tracking-active-label">
                      Current stage
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="orders-loading">
        <button
          type="button"
          className="orders-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back to previous page"
        >
          ← Back
        </button>
        <h2>My Orders</h2>
        <p>Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <button
        type="button"
        className="orders-back-btn"
        onClick={() => navigate(-1)}
        aria-label="Go back to previous page"
      >
        ← Back
      </button>
      <h2>My Orders</h2>

      {errorMessage && (
        <p className="error-message" style={{ marginBottom: "12px" }}>
          {errorMessage}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="empty-orders">
          <h3>No Orders Yet</h3>
          <p>Your orders will appear here after checkout.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const isExpanded =
              selectedOrder?.order?.order_id === order.order_id;
            const allowCancel = canCancelOrder(order);
            const isCancelling = cancellingOrderId === order.order_id;

            const detailOrder = isExpanded ? selectedOrder.order : null;
            const referenceNumber = detailOrder
              ? getReferenceNumber(detailOrder)
              : "";
            const receiptSrc = detailOrder ? getReceiptSrc(detailOrder) : "";

            return (
              <div className="order-card" key={order.order_id}>
                <div className="order-card-header">
                  <h3>
                    Order #AM-{String(order.order_id).padStart(4, "0")}
                  </h3>
                  <span
                    className={`order-status ${order.status || "pending"}`}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>
                <div className="order-card-info">
                  <p>
                    <strong>Total</strong>
                    <span>{formatMoney(order.total_amount)}</span>
                  </p>
                  <p>
                    <strong>Order Date</strong>
                    <span>
                      {order.order_date
                        ? new Date(order.order_date).toLocaleString()
                        : "N/A"}
                    </span>
                  </p>
                </div>

                <div
                  className="order-card-actions"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="view-order-btn"
                    onClick={() => viewOrder(order.order_id)}
                    aria-expanded={isExpanded}
                  >
                    {detailsLoading === order.order_id
                      ? "Loading details..."
                      : isExpanded
                        ? "Hide Order Details ↑"
                        : "View Order Details ↓"}
                  </button>

                  {allowCancel && (
                    <button
                      type="button"
                      className="cancel-order-btn"
                      onClick={() => openCancelModal(order)}
                      disabled={isCancelling}
                      style={{
                        padding: "9px 14px",
                        borderRadius: "8px",
                        border: "1px solid #dc2626",
                        backgroundColor: "#fff5f5",
                        color: "#b91c1c",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: isCancelling ? "not-allowed" : "pointer",
                        opacity: isCancelling ? 0.65 : 1,
                      }}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </div>

                {detailsLoading === order.order_id && (
                  <div className="order-details-dropdown">
                    <p>Loading order details...</p>
                  </div>
                )}
                {isExpanded && detailOrder && (
                  <div className="order-details-dropdown">
                    <h3>
                      Order #AM-
                      {String(detailOrder.order_id).padStart(4, "0")}
                    </h3>
                    {renderTracking(detailOrder.status)}
                    <div className="order-detail-section">
                      <h4>Ordered Products</h4>
                      {selectedOrder.items?.length ? (
                        selectedOrder.items.map((item) => (
                          <div
                            className="order-detail-product"
                            key={item.order_item_id}
                          >
                            <div>
                              <strong>{item.product_name}</strong>
                              <p>
                                Quantity: {item.quantity} ×{" "}
                                {formatMoney(item.price)}
                              </p>
                            </div>
                            <strong>{formatMoney(item.subtotal)}</strong>
                          </div>
                        ))
                      ) : (
                        <p>No products found for this order.</p>
                      )}
                      <div className="order-detail-total">
                        <strong>Total</strong>
                        <strong>
                          {formatMoney(detailOrder.total_amount)}
                        </strong>
                      </div>
                    </div>
                    <div className="order-detail-section">
                      <h4>Delivery Information</h4>
                      <p>
                        <strong>Address:</strong>{" "}
                        {detailOrder.delivery_address || "Not provided"}
                      </p>
                      <p>
                        <strong>Contact:</strong>{" "}
                        {detailOrder.contact_number || "Not provided"}
                      </p>
                      <p>
                        <strong>Driver / Rider:</strong>{" "}
                        {detailOrder.rider_name || "Not yet assigned"}
                      </p>
                      <p>
                        <strong>Driver Mobile:</strong>{" "}
                        {detailOrder.rider_contact_number || "Not available"}
                      </p>
                      <p>
                        <strong>Delivery Status:</strong>{" "}
                        {formatStatus(detailOrder.delivery_status)}
                      </p>
                      {detailOrder.notes && (
                        <p>
                          <strong>Notes:</strong> {detailOrder.notes}
                        </p>
                      )}
                    </div>
                    <div className="order-detail-section">
                      <h4>Payment Information</h4>
                      <p>
                        <strong>Method:</strong>{" "}
                        {detailOrder.payment_method || "Not available"}
                      </p>
                      <p>
                        <strong>Payment Status:</strong>{" "}
                        {formatStatus(detailOrder.payment_status)}
                      </p>
                      <p>
                        <strong>Amount:</strong>{" "}
                        {formatMoney(detailOrder.payment_amount)}
                      </p>
                      <p>
                        <strong>GCash Reference No.:</strong>{" "}
                        {referenceNumber || "Not yet provided"}
                      </p>
                      <div style={{ marginTop: "8px" }}>
                        <strong>Shipping Receipt (Optional):</strong>
                        {receiptSrc ? (
                          <div style={{ marginTop: "8px" }}>
                            <img
                              src={receiptSrc}
                              alt="GCash Shipping Receipt"
                              style={{
                                maxWidth: "220px",
                                width: "100%",
                                height: "auto",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                              }}
                            />
                          </div>
                        ) : (
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: "0.88rem",
                              color: "#64748b",
                            }}
                          >
                            No receipt image uploaded (optional).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orderToCancel && (
        <div
          className="cancel-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancelModalTitle"
          onClick={closeCancelModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 9999,
          }}
        >
          <div
            className="cancel-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "22px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.22)",
              color: "#1e293b",
            }}
          >
            <h3
              id="cancelModalTitle"
              style={{
                margin: "0 0 10px",
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Cancel Order #AM-
              {String(orderToCancel.order_id).padStart(4, "0")}?
            </h3>

            <p
              style={{
                margin: "0 0 18px",
                fontSize: "0.94rem",
                lineHeight: 1.5,
                color: "#475569",
              }}
            >
              Are you sure you want to cancel this order? If you already paid
              an advance shipping fee via GCash, please coordinate with the LGU
              Admin regarding your payment.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={Boolean(cancellingOrderId)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: cancellingOrderId ? "not-allowed" : "pointer",
                }}
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={confirmCancelOrder}
                disabled={Boolean(cancellingOrderId)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: cancellingOrderId ? "not-allowed" : "pointer",
                  opacity: cancellingOrderId ? 0.65 : 1,
                }}
              >
                {cancellingOrderId ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
