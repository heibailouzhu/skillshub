import { useEffect, useState } from 'react';
import { getAdminSkills, getAdminUsers, updateAdminSkillStatus, updateAdminUserRole, type AdminSkillItem, type AdminUserItem } from '../api/admin';
import AdminLayout from '../components/AdminLayout';
import { Badge, Button, Card, CardBody } from '../components';
import { useI18n } from '../i18n';

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<'skills' | 'users'>('skills');
  const [skills, setSkills] = useState<AdminSkillItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, usersRes] = await Promise.all([
          getAdminSkills({ page: 1, page_size: 50 }),
          getAdminUsers({ page: 1, page_size: 50 }),
        ]);
        setSkills(skillsRes.skills || []);
        setUsers(usersRes.users || []);
      } catch (err: any) {
        setError(err.response?.data?.error || t.messages.adminLoadFailed);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t.messages.adminLoadFailed]);

  const handleTogglePublish = async (skill: AdminSkillItem) => {
    try {
      await updateAdminSkillStatus(skill.id, { is_published: !skill.is_published });
      setSkills((prev) => prev.map((item) => item.id === skill.id ? { ...item, is_published: !item.is_published } : item));
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.updateSkillStatusFailed);
    }
  };

  const handleToggleAdmin = async (user: AdminUserItem) => {
    try {
      await updateAdminUserRole(user.id, { is_admin: !user.is_admin });
      setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, is_admin: !item.is_admin } : item));
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.updateUserRoleFailed);
    }
  };

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {error && <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
      {loading ? (
        <div className="theme-text-soft">{t.common.loading}</div>
      ) : activeSection === 'skills' ? (
        <div className="grid gap-4">
          {skills.length === 0 ? (
            <Card><CardBody>{t.admin.noSkills}</CardBody></Card>
          ) : skills.map((skill) => (
            <Card key={skill.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold theme-text">{skill.title}</div>
                  <div className="mt-1 text-sm theme-text-soft">{skill.description || '-'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={skill.is_published ? 'success' : 'warning'}>{skill.is_published ? t.admin.published : t.admin.unpublished}</Badge>
                  <Button variant="secondary" onClick={() => handleTogglePublish(skill)}>{skill.is_published ? t.common.hide : t.common.publishAction}</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {users.length === 0 ? (
            <Card><CardBody>{t.admin.noUsers}</CardBody></Card>
          ) : users.map((user) => (
            <Card key={user.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold theme-text">{user.username}</div>
                  <div className="mt-1 text-sm theme-text-soft">{user.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.is_admin ? 'primary' : 'default'}>{user.is_admin ? t.admin.adminUser : t.admin.normalUser}</Badge>
                  <Button variant="secondary" onClick={() => handleToggleAdmin(user)}>{user.is_admin ? t.admin.revokeAdmin : t.admin.makeAdmin}</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}