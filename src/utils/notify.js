export const notify = (
  type = 'success',
  title = 'Success',
  message = '',
  duration = 3200
) => {
  window.dispatchEvent(
    new CustomEvent('aniMalayToast', {
      detail: {
        type,
        title,
        message,
        duration,
      },
    })
  )
}
