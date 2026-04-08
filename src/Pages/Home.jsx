import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../Ui/Button";

function ChooseRole() {
  const [chooseRole, setChooseRole] = useState(null);
  const navigate = useNavigate();

  function handleRegister() {
    if (chooseRole === "ولي أمر") {
      navigate("/login/parents");
    } else if (chooseRole === "معلم") {
      navigate("/login/teachers");
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-6 w-full"
      dir="rtl"
    >
      <h2 className="font-bold text-3xl text-center px-4">
        أهلاً وسهلاً، ادخل كولي أمر أو معلم
      </h2>
      <div className="flex gap-5 flex-col w-[80%] md:w-auto md:flex-row items-center justify-center">
        <Button
          useDefaultStyles={false}
          className={`px-24 py-20 text-2xl min-w-[300px] bg-transparent ${
            chooseRole === "ولي أمر"
              ? "!bg-[var(--main-color)] !text-white"
              : "text-black"
          }  transition-colors duration-500  hover:bg-[var(--main-color)] hover:text-white font-bold rounded-2xl border-[1px] border-[var(--main-color)] cursor-pointer`}
          onClick={() => setChooseRole("ولي أمر")}
        >
          ولي أمر{" "}
        </Button>
        <Button
          useDefaultStyles={false}
          className={`px-24 py-20 text-2xl min-w-[300px] bg-transparent ${
            chooseRole === "معلم"
              ? "!bg-[var(--main-color)] !text-white"
              : "text-black"
          }  transition-colors duration-500  hover:bg-[var(--main-color)] hover:text-white font-bold rounded-2xl border-[1px] border-[var(--main-color)] cursor-pointer`}
          onClick={() => setChooseRole("معلم")}
        >
          معلم{" "}
        </Button>{" "}
        <Button
          withTransition={chooseRole !== null}
          withHover={chooseRole !== null}
          className={`py-4 px-10 mb-2`}
          disabled={chooseRole === null}
          onClick={handleRegister}
        >
          {chooseRole === null
            ? "تسجيل حساب"
            : chooseRole === "معلم"
              ? "تسجيل كمعلم"
              : "تسجيل كولي أمر"}{" "}
        </Button>
      </div>
    </div>
  );
}

export default ChooseRole;
