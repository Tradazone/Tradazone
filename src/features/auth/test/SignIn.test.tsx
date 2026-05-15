// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

let mockNavigate;
let mockSearchParams;
let mockIsAuthenticated;
let mockLoadSession;
let mockLastWallet;
const mockConnectWallet = vi.fn();
const mockUpdateProfile = vi.fn();

const DRAFT_KEY = "tradazone_test_signin_description_draft";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    Link: ({ children, to, ...props }) => React.createElement("a", { href: to, ...props }, children),
  };
});

vi.mock("../../../components/ui/Logo", () => ({
  default: () => React.createElement("div", { "data-testid": "logo" }),
}));

vi.mock("../../../assets/auth-splash.svg", () => ({ default: "signin-splash.svg" }));

vi.mock("../../../components/forms/RichTextEditor", () => ({
  default: ({ label, value, onChange, hint }) => (
    <div>
      <label htmlFor="mock-rich-text-editor">{label}</label>
      <textarea
        id="mock-rich-text-editor"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p>{hint}</p> : null}
    </div>
  ),
}));

vi.mock("../../../config/env", () => ({
  STORAGE_PREFIX: "tradazone_test",
  IS_STAGING: false,
  APP_NAME: "Tradazone",
}));

vi.mock("../../../context/AuthContext", () => ({
  loadSession: () => mockLoadSession,
  useAuthActions: () => ({
    connectWallet: mockConnectWallet,
    updateProfile: mockUpdateProfile,
  }),
  useAuthIsAuthenticated: () => mockIsAuthenticated,
  useAuthWalletState: () => ({
    lastWallet: mockLastWallet,
  }),
}));

vi.mock("../../../components/ui/ConnectWalletModal", () => ({
  default: ({ isOpen, onConnect }) =>
    isOpen ? (
      <button data-testid="mock-connect-success" onClick={() => onConnect()}>
        Simulate Connect
      </button>
    ) : null,
}));

async function renderSignIn() {
  const { default: SignIn } = await import("../pages/SignIn");
  const { BrowserRouter } = await import("react-router-dom");

  render(
    React.createElement(BrowserRouter, null, React.createElement(SignIn)),
  );
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  mockNavigate = vi.fn();
  mockSearchParams = new URLSearchParams();
  mockIsAuthenticated = false;
  mockLoadSession = null;
  mockLastWallet = "GABCD123456789";
  mockConnectWallet.mockReset();
  mockUpdateProfile.mockReset();
});

describe("SignIn", () => {
  it("renders the primary headline and connect wallet button", async () => {
    await renderSignIn();

    expect(
      screen.getByText(/The fastest way to get paid in crypto/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect your wallet to sign in/i })
    ).toBeInTheDocument();
  });

  it("shows the session-expired banner when reason=expired", async () => {
    mockSearchParams = new URLSearchParams("reason=expired");

    await renderSignIn();

    expect(
      screen.getByText(/your session expired/i)
    ).toBeInTheDocument();
  });

  it("shows returning-user wallet hint when lastWallet is set", async () => {
    mockLastWallet = "GABCD1234567890XYZ";

    await renderSignIn();

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });

  it("navigates after a successful wallet connection", async () => {
    const user = userEvent.setup();

    await renderSignIn();

    await user.click(screen.getByRole("button", { name: /connect your wallet to sign in/i }));
    await user.click(screen.getByTestId("mock-connect-success"));

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("redirects authenticated users immediately", async () => {
    mockSearchParams = new URLSearchParams("redirect=/dashboard");
    mockIsAuthenticated = true;

    await renderSignIn();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
