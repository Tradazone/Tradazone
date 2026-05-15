// @ts-nocheck
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import CustomerList from '../pages/CustomerList';
import { DataProvider } from "../../../context/DataContext";

let mockCustomers: any[] | null = null;
const mockUpdateCustomerDescription = vi.fn();

// Mock the context to simulate malformed data
vi.mock("../../../context/DataContext", async () => {
  const actual = await vi.importActual("../../../context/DataContext");
  return {
    ...actual,
    useData: () => ({
      customers: mockCustomers,
      updateCustomerDescription: mockUpdateCustomerDescription,
    }),
  };
});

describe("CustomerList Stability", () => {
  it("renders without crashing when customers is null", () => {
    mockCustomers = null;
    render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );

    // Should show EmptyState instead of crashing
    expect(screen.getByText(/No customers yet/i)).toBeInTheDocument();
  });

  it("renders the rich text editor when customers exist", () => {
    mockCustomers = [
      {
        id: "c-1",
        name: "Acme Corp",
        email: "acme@example.com",
        description: "<p>Preferred partner</p>",
      },
    ];

    render(
      <MemoryRouter>
        <CustomerList />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Customer description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });
});
