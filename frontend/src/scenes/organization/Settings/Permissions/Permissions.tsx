import { LemonSelect } from '@posthog/lemon-ui'
import { useActions, useValues } from 'kea'
import { LemonTable, LemonTableColumns } from 'lib/components/LemonTable'
import { AccessLevel } from '~/types'
import { permissionsLogic, FormattedResourceLevel } from './permissionsLogic'

export function Permissions(): JSX.Element {
    const { allPermissions } = useValues(permissionsLogic)
    const { updateOrganizationResourcePermission } = useActions(permissionsLogic)

    const columns: LemonTableColumns<FormattedResourceLevel> = [
        {
            key: 'resource',
            title: 'Resource',
            dataIndex: 'resource',
            render: function RenderResource(_, permission) {
                return <b>{permission.resource}</b>
            },
        },
        {
            key: 'access_level',
            title: 'Access Level',
            dataIndex: 'access_level',
            render: function RenderAccessLevel(_, permission) {
                return (
                    <LemonSelect
                        value={permission.access_level}
                        onChange={(newValue) =>
                            updateOrganizationResourcePermission({
                                id: permission.id,
                                resource: permission.resource,
                                access_level: newValue,
                            })
                        }
                        options={[
                            {
                                value: AccessLevel.WRITE,
                                label: 'View & Edit',
                            },
                            {
                                value: AccessLevel.READ,
                                label: 'View Only',
                            },
                            {
                                value: AccessLevel.CUSTOM_ASSIGNED,
                                label: 'View & Assigned Edit',
                            },
                        ]}
                    />
                )
            },
        },
    ]

    return (
        <>
            <div className="flex items-center">
                <div style={{ flexGrow: 1 }}>
                    <h2 id="roles" className="subtitle">
                        Permission Defaults
                    </h2>
                    <p className="text-muted-alt">
                        Add default permission levels for posthog resources. Use roles to apply permissions to specific
                        sets of users.
                    </p>
                </div>
            </div>
            <LemonTable
                dataSource={allPermissions}
                columns={columns}
                rowKey={() => 'id'}
                style={{ marginTop: '1rem' }}
                loading={false}
                data-attr="org-permissions-table"
                defaultSorting={{ columnKey: 'level', order: -1 }}
                pagination={{ pageSize: 50 }}
            />
        </>
    )
}
