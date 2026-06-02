import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import OrderPage from "../pages/OrderPage";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: undefined }),
  navigate: () => vi.fn(),
  useNavigate: () => vi.fn(),
}));

// Mock AuthContext hook
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock DataContext hook
const mockUseData = vi.fn();
vi.mock("@/contexts/DataContext", () => ({
  useData: () => mockUseData(),
}));

// Mock Permissions hook
const mockCan = vi.fn();
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: mockCan,
  }),
}));

const mockProducts = [
  { id: "prod-1", productCode: "P1", productName: "Cement Grade A", bagSize: "50kg", rate: 450, gst: 18, weight: 50 },
];

const mockDealers = [
  { dealerCode: "D1", dealerName: "Shyam Marble", city: "Jaipur", assignedSoEmail: "sales@kamla.com", distributorName: "Dist 1", creditLimit: 100000, outstanding: 5000, active: true },
];

const mockDistributors = [
  { distributorName: "Dist 1", area: "Jaipur", assignedSoEmail: "sales@kamla.com", creditLimit: 200000, outstanding: 10000, active: true },
];

describe("OrderPage DOM - Sales Price Editing Setting Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCan.mockReturnValue(false); // By default, Sales Officers do not have explicit edit_order_price permission override
  });

  it("should disable price per unit input field when settings allowPriceEditSales is false for a Sales Officer", async () => {
    // 1. Mock logged in user as SALES officer
    mockUseAuth.mockReturnValue({
      user: { email: "sales@kamla.com", role: "SALES", name: "Sahil Patil" },
    });

    // 2. Mock global settings to have Price Editing OFF
    mockUseData.mockReturnValue({
      dealers: mockDealers,
      distributors: mockDistributors,
      products: mockProducts,
      orders: [],
      warehouses: [{ id: 1, name: "Main Warehouse" }],
      addOrder: vi.fn(),
      updateOrderItems: vi.fn(),
      settings: {
        allowPriceEditSales: false,
        allow_price_edit_sales: false,
      },
      refreshAll: vi.fn(),
    });

    // 3. Render OrderPage in JSDOM
    render(<OrderPage />);

    // Verify inputs by placeholder
    // The Quantity input is index 0, and the Price input is index 1
    const placeholders = screen.getAllByPlaceholderText("0");
    const qtyInput = placeholders[0];
    const priceInput = placeholders[1];

    // Assert that the price input field is in the DOM and is disabled
    expect(priceInput).toBeInTheDocument();
    expect(qtyInput).not.toBeDisabled();
    expect(priceInput).toBeDisabled();
  });

  it("should enable price per unit input field when settings allowPriceEditSales is true for a Sales Officer", async () => {
    // 1. Mock logged in user as SALES officer
    mockUseAuth.mockReturnValue({
      user: { email: "sales@kamla.com", role: "SALES", name: "Sahil Patil" },
    });

    // 2. Mock global settings to have Price Editing ON
    mockUseData.mockReturnValue({
      dealers: mockDealers,
      distributors: mockDistributors,
      products: mockProducts,
      orders: [],
      warehouses: [{ id: 1, name: "Main Warehouse" }],
      addOrder: vi.fn(),
      updateOrderItems: vi.fn(),
      settings: {
        allowPriceEditSales: true,
        allow_price_edit_sales: true,
      },
      refreshAll: vi.fn(),
    });

    // 3. Render OrderPage
    render(<OrderPage />);

    // 4. Retrieve placeholders and assert that the price input field is enabled
    const placeholders = screen.getAllByPlaceholderText("0");
    const priceInput = placeholders[1];

    expect(priceInput).toBeInTheDocument();
    expect(priceInput).not.toBeDisabled();
  });
});
