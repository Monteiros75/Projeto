function PageHeader({ title, description }) {
  return (
    <div className="mb-6 border-b border-gray-100 pb-4">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default PageHeader
