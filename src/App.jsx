import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Pages/Home";
import ParentDashboard from "./Pages/ParentDashboard";
import TeacherDashboard from "./Pages/TeacherDashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/parent",
    element: <ParentDashboard />,
  },
  {
    path: "/teacher",
    element: <TeacherDashboard />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
