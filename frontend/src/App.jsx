import { useEffect, useState } from "react";
import { api } from "./api/client";

export default function App() {
  const [msg, setMsg] = useState("cargando...");

  useEffect(() => {
    api.get("/").then(res => setMsg(res.data.msg)).catch(() => setMsg("error"));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>MachTrueke</h1>
      <p>Backend dice: <b>{msg}</b></p>
      <hr />
      <button onClick={async () => {
        const { data } = await api.get("/products");
        alert("Productos demo: " + JSON.stringify(data));
      }}>
        Probar /products
      </button>
    </div>
  );
}
