import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
const el=document.getElementById("root");
if(!el) throw new Error("Elemento #root não encontrado");
createRoot(el).render(<React.StrictMode><RouterProvider router={getRouter()} /></React.StrictMode>);