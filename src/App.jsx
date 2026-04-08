import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Pages/Home";
import ParentDashboard from "./Pages/ParentDashboard";
import TeacherDashboard from "./Pages/TeacherDashboard";
import TeacherLessons from "./Pages/TeacherLessons";
import ParentsLogin from "./Features/Authentication/ParentsLogin";
import TeachersLogin from "./Features/Authentication/TeachersLogin";
import AppLayout from "./Ui/AppLayout";
import AddChild from "./Features/Parents/AddChild";
import ChildSuccess from "./Features/Parents/ChildSuccess";
import ChildDetail from "./Pages/ChildDetail";
import ChildSchedule from "./Pages/ChildSchedule";
import ChildHomework from "./Pages/ChildHomework";
import ChildExpenses from "./Pages/ChildExpenses";
import ChildAttendanceSummary from "./Pages/ChildAttendanceSummary";
import ChildNotifications from "./Pages/ChildNotifications";
import JoinGroup from "./Pages/JoinGroup";
import GroupDetails from "./Pages/GroupDetails";
import TeacherStudentAnalytics from "./Pages/TeacherStudentAnalytics";
import TeacherAnalytics from "./Pages/TeacherAnalytics";
import TeacherPrivateStudentAnalytics from "./Pages/TeacherPrivateStudentAnalytics";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/parent",
        element: <ParentDashboard />,
      },
      {
        path: "/teacher/dashboard",
        element: <TeacherDashboard />,
      },
      {
        path: "/teacher/lessons",
        element: <TeacherLessons />,
      },
      {
        path: "/teacher/analytics",
        element: <TeacherAnalytics />,
      },
      {
        path: "/parent/add-child",
        element: <AddChild />,
      },
      {
        path: "/parent/child-success",
        element: <ChildSuccess />,
      },
      {
        path: "/parent/join-group",
        element: <JoinGroup />,
      },
      {
        path: "/teacher/group/:groupId",
        element: <GroupDetails />,
      },
      {
        path: "/teacher/group/:groupId/student/:childId/analytics",
        element: <TeacherStudentAnalytics />,
      },
      {
        path: "/teacher/lessons/student/:lessonId/:childId/analytics",
        element: <TeacherPrivateStudentAnalytics />,
      },
    ],
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login/parents",
    element: <ParentsLogin />,
  },
  {
    path: "/login/teachers",
    element: <TeachersLogin />,
  },
  {
    path: "/parent/child/:childId",
    element: <ChildDetail />,
  },
  {
    path: "/parent/child/:childId/schedule",
    element: <ChildSchedule />,
  },
  {
    path: "/parent/child/:childId/homework",
    element: <ChildHomework />,
  },
  {
    path: "/parent/child/:childId/expenses",
    element: <ChildExpenses />,
  },
  {
    path: "/parent/child/:childId/attendance-summary",
    element: <ChildAttendanceSummary />,
  },
  {
    path: "/parent/child/:childId/notifications",
    element: <ChildNotifications />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
