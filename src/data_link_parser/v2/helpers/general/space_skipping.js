const spaceSkipping = (params) => {
    const { dataLink } = params
    let count = 0
    for (const current of dataLink) {
        count++
        if (current[2] === ' ') continue
        break
    }
    return ' '.repeat(count)
}

export default spaceSkipping
