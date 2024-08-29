// 数据权限查询处理
export function matchDeptPath(userDeptPath: string | number) {
  return {
    $expr: {
      $regexMatch: {
        input: '$deptTreePath',
        regex: new RegExp(`^${userDeptPath}`), // 匹配路径的前缀
      },
    },
  };
}

// 部门权限查询处理
export function rolesDeptPath(userDeptPath: string | number) {
  return {
    $expr: {
      $regexMatch: {
        input: '$TreePath',
        regex: new RegExp(`^${userDeptPath}`), // 匹配路径的前缀
      },
    },
  };
}
