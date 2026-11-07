import UserManagement from "@/components/users/UserManagement"
import type { CommunityUser } from "@/types"

function UsersPage({
  users,
  onSelect,
}: {
  users: CommunityUser[]
  onSelect: (user: CommunityUser) => void
}) {
  return (
    <div className="page-stack">
      <UserManagement onSelect={onSelect} users={users} />
    </div>
  )
}

export default UsersPage
