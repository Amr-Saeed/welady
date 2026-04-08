import { useChildrenByParent } from "../Features/Parents/useChildInfo";
import { useParentProfile } from "../Features/Parents/useParentProfile";
import ChildCard from "./ChildCard";

function ChildCards() {
  const { data: parentProfile } = useParentProfile();
  const {
    data: children,
    isLoading,
    error,
  } = useChildrenByParent(parentProfile?.id);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">جاري تحميل الأطفال...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">لم يتم العثور على أطفال</p>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">لا يوجد أطفال حتى الآن. قم بإضافة طفل!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}
    </div>
  );
}

export default ChildCards;
