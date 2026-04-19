import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Pages/Home";
import ParentDashboard from "./Pages/ParentDashboard";
import ProtectedRoute from "./Ui/ProtectedRoute";
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
import TeacherPasswordLogin from "./Features/Authentication/TeacherPasswordLogin";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/parent",
        element: (
          <ProtectedRoute allowedRole="parent">
            <ParentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher/lessons",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <TeacherLessons />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher/analytics",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <TeacherAnalytics />
          </ProtectedRoute>
        ),
      },
      {
        path: "/parent/add-child",
        element: (
          <ProtectedRoute allowedRole="parent">
            <AddChild />
          </ProtectedRoute>
        ),
      },
      {
        path: "/parent/child-success",
        element: (
          <ProtectedRoute allowedRole="parent">
            <ChildSuccess />
          </ProtectedRoute>
        ),
      },
      {
        path: "/parent/join-group",
        element: (
          <ProtectedRoute allowedRole="parent">
            <JoinGroup />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher/group/:groupId",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <GroupDetails />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher/group/:groupId/student/:childId/analytics",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <TeacherStudentAnalytics />
          </ProtectedRoute>
        ),
      },
      {
        path: "/teacher/lessons/student/:lessonId/:childId/analytics",
        element: (
          <ProtectedRoute allowedRole="teacher">
            <TeacherPrivateStudentAnalytics />
          </ProtectedRoute>
        ),
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
    path: "/login/teacher-password",
    element: <TeacherPasswordLogin />,
  },
  {
    path: "/login/teachers/password",
    element: <TeacherPasswordLogin />,
  },
  {
    path: "/parent/child/:childId",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/child/:childId/schedule",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildSchedule />
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/child/:childId/homework",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildHomework />
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/child/:childId/expenses",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildExpenses />
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/child/:childId/attendance-summary",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildAttendanceSummary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/child/:childId/notifications",
    element: (
      <ProtectedRoute allowedRole="parent">
        <ChildNotifications />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
