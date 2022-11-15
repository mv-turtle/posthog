from rest_framework import status

from ee.api.test.base import APILicensedTest
from ee.models.feature_flag_role_access import FeatureFlagRoleAccess
from ee.models.role import Role
from posthog.models import Organization
from posthog.models.feature_flag import FeatureFlag
from posthog.models.organization import OrganizationMembership
from posthog.models.user import User


class TestFeatureFlagRoleAccessAPI(APILicensedTest):
    def setUp(self):
        super().setUp()
        self.eng_role = Role.objects.create(name="Engineering", organization=self.organization)
        self.marketing_role = Role.objects.create(name="Marketing", organization=self.organization)
        self.feature_flag = FeatureFlag.objects.create(
            created_by=self.user, team=self.team, key="flag_role_access", name="Flag role access"
        )

    def test_can_always_add_role_access_if_creator_of_feature_flag(self):
        self.organization.feature_flags_access_level = (
            Organization.FeatureFlagsAccessLevel.DEFAULT_VIEW_ALLOW_EDIT_BASED_ON_ROLE
        )
        self.organization.save()
        self.assertEqual(self.user.role_memberships.count(), 0)
        flag_role_access_create_res = self.client.post(
            f"/api/organizations/@current/feature_flag_role_access",
            {"role": self.eng_role.id, "feature_flag": self.feature_flag.id},
        )
        self.assertEqual(flag_role_access_create_res.status_code, status.HTTP_201_CREATED)
        flag_role = FeatureFlagRoleAccess.objects.get(id=flag_role_access_create_res.json()["id"])
        self.assertEqual(flag_role.role.name, self.eng_role.name)
        self.assertEqual(flag_role.feature_flag.id, self.feature_flag.id)

    def test_cannot_add_role_access_if_feature_flags_access_level_too_low_and_not_creator(self):
        self.organization.feature_flags_access_level = Organization.FeatureFlagsAccessLevel.CAN_ONLY_VIEW
        self.organization.save()
        self.assertEqual(self.user.role_memberships.count(), 0)
        user_a = User.objects.create_and_join(self.organization, "a@potato.com", None)
        flag = FeatureFlag.objects.create(created_by=user_a, key="flag_a", name="Flag A", team=self.team)
        res = self.client.post(
            f"/api/organizations/@current/feature_flag_role_access",
            {"role": self.marketing_role.id, "feature_flag": flag.id},
        )
        response_data = res.json()
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response_data, self.permission_denied_response("You can't edit roles to this feature flag."))

    def test_can_add_role_access_if_role_feature_flags_access_level_allows(self):
        self.organization.feature_flags_access_level = Organization.FeatureFlagsAccessLevel.CAN_ONLY_VIEW
        self.organization_membership.level = OrganizationMembership.Level.ADMIN
        self.organization.save()
        self.organization_membership.save()
        self.client.post(
            f"/api/organizations/@current/roles/{self.eng_role.id}/role_memberships", {"user_uuid": self.user.uuid}
        )
        self.assertEqual(
            self.user.role_memberships.first().role.feature_flags_access_level,
            Organization.FeatureFlagsAccessLevel.CAN_ALWAYS_EDIT,
        )
        user_a = User.objects.create_and_join(self.organization, "a@potato.com", None)
        flag = FeatureFlag.objects.create(created_by=user_a, key="flag_a", name="Flag A", team=self.team)

        res = self.client.post(
            f"/api/organizations/@current/feature_flag_role_access",
            {"role": self.marketing_role.id, "feature_flag": flag.id},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)