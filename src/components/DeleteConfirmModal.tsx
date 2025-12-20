'use client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div
        className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      ></div>
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            确认删除
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                确认删除操作
              </h4>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 ml-14">
            确定要删除 &quot;<span className="font-medium">{itemName}</span>
            &quot; 吗？此操作不可撤销。
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
