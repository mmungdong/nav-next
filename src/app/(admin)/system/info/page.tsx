'use client';

import { useState } from 'react';

export default function InfoManagementPage() {
  const [systemInfo] = useState({
    version: '1.0.0',
    lastUpdated: '2024-01-15',
    totalWebsites: 128,
    totalCategories: 12,
    totalTags: 24,
    totalUsers: 1,
    storageUsed: '2.4 MB',
    uptime: '99.9%',
  });

  const [logs] = useState([
    {
      id: 1,
      action: '用户登录',
      user: 'admin',
      ip: '192.168.1.100',
      timestamp: '2024-01-15 14:30:22',
    },
    {
      id: 2,
      action: '添加网站',
      user: 'admin',
      ip: '192.168.1.100',
      timestamp: '2024-01-15 14:25:10',
    },
    {
      id: 3,
      action: '更新设置',
      user: 'admin',
      ip: '192.168.1.100',
      timestamp: '2024-01-15 14:20:45',
    },
    {
      id: 4,
      action: '删除标签',
      user: 'admin',
      ip: '192.168.1.100',
      timestamp: '2024-01-15 14:15:33',
    },
  ]);

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        系统信息
      </h1>

      {/* 系统概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                ></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                版本
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemInfo.version}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                ></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                网站总数
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemInfo.totalWebsites}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                ></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                分类数
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemInfo.totalCategories}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                ></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                标签数
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemInfo.totalTags}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 系统详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            系统详情
          </h2>
          <dl className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                版本号
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.version}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                最后更新
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.lastUpdated}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                网站总数
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.totalWebsites}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                分类数
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.totalCategories}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                标签数
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.totalTags}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                用户数
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.totalUsers}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                存储使用
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.storageUsed}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                系统可用率
              </dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {systemInfo.uptime}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            系统状态
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  数据库连接
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  本地JSON文件
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                正常
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  文件系统
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  读写权限正常
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                正常
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  缓存
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  内存缓存启用
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                正常
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  API服务
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  静态文件服务
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                正常
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作日志 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            操作日志
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  操作
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  用户
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  IP地址
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
