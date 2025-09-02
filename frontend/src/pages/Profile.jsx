import { useParams } from "react-router-dom";
export default function Profile() {
  const { id } = useParams();
  return <h1 className="text-2xl font-bold">Perfil: {id}</h1>;
}
