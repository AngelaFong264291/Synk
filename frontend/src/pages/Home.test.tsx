import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { Home } from "./Home";

describe("Home", () => {
  it("renders landing heading", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </AuthProvider>,
    );
    expect(
      screen.getByRole("heading", {
        name: /synk gives your workspace one place to track changes/i,
      }),
    ).toBeInTheDocument();
  });
});
