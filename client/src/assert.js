
export default (t, message) => {
    if (!t) {
        throw new Error(message)
    }
}
