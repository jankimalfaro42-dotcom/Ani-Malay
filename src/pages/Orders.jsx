import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(savedUser);
        const response = await fetch(
          `${API_BASE_URL}/api/orders?user_id=${user.user_id}`
        );
        if (!response.ok) {
          throw new Error("Failed to load orders");
        }
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const viewOrder = async (orderId) => {
    if (selectedOrder?.order?.order_id === orderId) {
      setSelectedOrder(null);
      return;
    }

    try {
      setDetailsLoading(orderId);
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}`
      );
      if (!response.ok) {
        throw new Error("Failed to load order details");
      }
      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error("Failed to load order details:", error);
      alert("Failed to load order details. Please try again.");
    } finally {
      setDetailsLoading(null);
    }
  };

  const formatMoney = (amount) =>
    `₱${Number(amount || 0).toFixed(2)}`;

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
          <p><strong>Order Cancelled</strong></p>
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
            const isComplete =
              currentIndex >= 0 && index <= currentIndex;
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
                {detailsLoading === order.order_id && (
                  <div className="order-details-dropdown">
                    <p>Loading order details...</p>
                  </div>
                )}
                {isExpanded && (
                  <div className="order-details-dropdown">
                    <h3>
                      Order #AM-
                      {String(selectedOrder.order.order_id).padStart(4, "0")}
                    </h3>
                    {renderTracking(selectedOrder.order.status)}
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
                          {formatMoney(selectedOrder.order.total_amount)}
                        </strong>
                      </div>
                    </div>
                    <div className="order-detail-section">
                      <h4>Delivery Information</h4>
                      <p>
                        <strong>Address:</strong>{" "}
                        {selectedOrder.order.delivery_address || "Not provided"}
                      </p>
                      <p>
                        <strong>Contact:</strong>{" "}
                        {selectedOrder.order.contact_number || "Not provided"}
                      </p>
                      <p>
                        <strong>Driver / Rider:</strong>{" "}
                        {selectedOrder.order.rider_name || "Not yet assigned"}
                      </p>
                      <p>
                        <strong>Driver Mobile:</strong>{" "}
                        {selectedOrder.order.rider_contact_number ||
                          "Not available"}
                      </p>
                      <p>
                        <strong>Delivery Status:</strong>{" "}
                        {formatStatus(selectedOrder.order.delivery_status)}
                      </p>
                      {selectedOrder.order.notes && (
                        <p>
                          <strong>Notes:</strong>{" "}
                          {selectedOrder.order.notes}
                        </p>
                      )}
                    </div>
                    <div className="order-detail-section">
                      <h4>Payment Information</h4>
                      <p>
                        <strong>Method:</strong>{" "}
                        {selectedOrder.order.payment_method || "Not available"}
                      </p>
                      <p>
                        <strong>Payment Status:</strong>{" "}
                        {formatStatus(selectedOrder.order.payment_status)}
                      </p>
                      <p>
                        <strong>Amount:</strong>{" "}
                        {formatMoney(selectedOrder.order.payment_amount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Orders;