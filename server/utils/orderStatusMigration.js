export function orderStatusMigrationPipeline() {
  const mapped = (expression) => ({
    $switch: {
      branches: [
        { case: { $eq: [expression, 'confirmed'] }, then: 'processing' },
        { case: { $eq: [expression, 'shipped'] }, then: 'out_for_delivery' },
      ],
      default: expression,
    },
  });
  return [
    {
      $set: {
        orderStatus: mapped('$orderStatus'),
        statusHistory: {
          $map: {
            input: { $ifNull: ['$statusHistory', []] },
            as: 'entry',
            in: { $mergeObjects: ['$$entry', { status: mapped('$$entry.status') }] },
          },
        },
      },
    },
  ];
}
