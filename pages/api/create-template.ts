import { NextApiHandler } from 'next'
import Filter from 'bad-words'
import { query } from '../../lib/db'

const filter = new Filter()

const handler: NextApiHandler = async (req, res) => {
  const { name, creator, html } = req.body
  console.log(req.body)
  try {
    if (!name || !creator || !html) {
      return res
        .status(400)
        .json({ message: '`name`, `creator` and `html` are required' })
    }

    const results = await query(
      `
      INSERT INTO template (name, creator, html)
      VALUES (?, ?, ?)
      `,
      [filter.clean(name), filter.clean(creator), filter.clean(html)]
    )
    return res.json(results)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

export default handler