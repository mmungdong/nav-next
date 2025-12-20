'use client';

import { useState } from 'react';

interface Submission {
  id: number;
  name: string;
  url: string;
  desc: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export default function CollectManagementPage() {
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      name: 'GitHub',
      url: 'https://github.com',
      desc: '全球最大的代码托管平台',
      status: 'pending',
      submittedAt: '2024-01-15',
    },
    {
      id: 2,
      name: 'Stack Overflow',
      url: 'https://stackoverflow.com',
      desc: '程序员问答社区',
      status: 'approved',
      submittedAt: '2024-01-10',
    },
    {
      id: 3,
      name: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      desc: 'Web开发权威文档',
      status: 'rejected',
      submittedAt: '2024-01-05',
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  // 过滤收录提交
  const filteredSubmissions = submissions.filter(
    (submission) =>
      submission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewSubmission = (submission: Submission) => {
    setViewingSubmission(submission);
    setShowModal(true);
  };

  const handleApprove = (id: number) => {
    setSubmissions(
      submissions.map((submission) =>
        submission.id === id
          ? { ...submission, status: 'approved' }
          : submission
      )
    );
  };

  const handleReject = (id: number) => {
    setSubmissions(
      submissions.map((submission) =>
        submission.id === id
          ? { ...submission, status: 'rejected' }
          : submission
      )
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setViewingSubmission(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          收录管理
        </h1>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索收录提交..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* 收录提交列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                网站名称
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                URL
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                描述
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                提交时间
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                状态
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSubmissions.map((submission) => (
              <tr key={submission.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {submission.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                    <a
                      href={submission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {submission.url}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {submission.desc}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {submission.submittedAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      submission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        : submission.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}
                  >
                    {submission.status === 'pending'
                      ? '待审核'
                      : submission.status === 'approved'
                        ? '已批准'
                        : '已拒绝'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleViewSubmission(submission)}
                    className="text-blue-500 hover:text-blue-700 mr-3"
                  >
                    查看
                  </button>
                  {submission.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="text-green-500 hover:text-green-700 mr-3"
                      >
                        批准
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        拒绝
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 收录提交详情模态框 */}
      {showModal && viewingSubmission && (
        <SubmissionModal
          submission={viewingSubmission}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function SubmissionModal({
  submission,
  onClose,
}: {
  submission: Submission;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          收录详情
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              网站名称
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {submission.name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL
            </label>
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              {submission.url}
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {submission.desc}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              提交时间
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {submission.submittedAt}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              状态
            </label>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                submission.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                  : submission.status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              }`}
            >
              {submission.status === 'pending'
                ? '待审核'
                : submission.status === 'approved'
                  ? '已批准'
                  : '已拒绝'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
