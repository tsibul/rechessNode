// import { knex } from '../../db'
// import { UserModel } from '../../models/user.model'
//
// describe('User Database Operations', () => {
//   beforeAll(async () => {
//     // Запускаем миграции перед всеми тестами
//     await knex.migrate.latest()
//   })
//
//   afterAll(async () => {
//     // Закрываем соединение с базой данных
//     await knex.destroy()
//   })
//
//   beforeEach(async () => {
//     // Очищаем таблицу users перед каждым тестом
//     await knex('users').truncate()
//   })
//
//   describe('Create User', () => {
//     it('should create a new user', async () => {
//       const userData = {
//         email: 'test@example.com',
//         name: 'Test User',
//         cart_id: null,
//         created_at: new Date(),
//         updated_at: new Date()
//       }
//
//       const [userId] = await UserModel.create(userData)
//       expect(userId).toBeDefined()
//
//       const user = await UserModel.findById(userId)
//       expect(user).toMatchObject({
//         ...userData,
//         id: userId,
//         // Преобразуем даты в строки для сравнения
//         created_at: expect.any(Date),
//         updated_at: expect.any(Date)
//       })
//     })
//
//     it('should not create user with duplicate email', async () => {
//       const userData = {
//         email: 'duplicate@example.com',
//         name: 'First User',
//         cart_id: null,
//         created_at: new Date(),
//         updated_at: new Date()
//       }
//
//       await UserModel.create(userData)
//
//       // Пытаемся создать пользователя с тем же email
//       await expect(UserModel.create(userData))
//         .rejects
//         .toThrow() // Должна быть ошибка уникальности
//     })
//   })
//
//   describe('Find User', () => {
//     it('should find user by email', async () => {
//       const userData = {
//         email: 'find@example.com',
//         name: 'Find User',
//         cart_id: null,
//         created_at: new Date(),
//         updated_at: new Date()
//       }
//
//       const [userId] = await UserModel.create(userData)
//       const user = await UserModel.findByEmail(userData.email)
//
//       expect(user).toMatchObject({
//         ...userData,
//         id: userId,
//         created_at: expect.any(Date),
//         updated_at: expect.any(Date)
//       })
//     })
//
//     it('should return null for non-existent email', async () => {
//       const user = await UserModel.findByEmail('nonexistent@example.com')
//       expect(user).toBeNull()
//     })
//   })
//
//   describe('Update User', () => {
//     it('should update user name', async () => {
//       const userData = {
//         email: 'update@example.com',
//         name: 'Original Name',
//         cart_id: null,
//         created_at: new Date(),
//         updated_at: new Date()
//       }
//
//       const [userId] = await UserModel.create(userData)
//
//       const newName = 'Updated Name'
//       await UserModel.update(userId, { name: newName })
//
//       const updatedUser = await UserModel.findById(userId)
//       expect(updatedUser?.name).toBe(newName)
//       expect(updatedUser?.updated_at).not.toEqual(userData.updated_at)
//     })
//   })
//
//   describe('Delete User', () => {
//     it('should delete user', async () => {
//       const userData = {
//         email: 'delete@example.com',
//         name: 'Delete User',
//         cart_id: null,
//         created_at: new Date(),
//         updated_at: new Date()
//       }
//
//       const [userId] = await UserModel.create(userData)
//       await UserModel.delete(userId)
//
//       const deletedUser = await UserModel.findById(userId)
//       expect(deletedUser).toBeNull()
//     })
//   })
//
//   describe('List Users', () => {
//     it('should list users with pagination', async () => {
//       // Создаем 5 пользователей
//       const userPromises = Array.from({ length: 5 }, (_, i) => {
//         return UserModel.create({
//           email: `user${i}@example.com`,
//           name: `User ${i}`,
//           cart_id: null,
//           created_at: new Date(),
//           updated_at: new Date()
//         })
//       })
//       await Promise.all(userPromises)
//
//       // Получаем первую страницу (2 пользователя)
//       const page1 = await UserModel.list({ page: 1, limit: 2 })
//       expect(page1.data).toHaveLength(2)
//       expect(page1.total).toBe(5)
//       expect(page1.page).toBe(1)
//       expect(page1.totalPages).toBe(3)
//
//       // Получаем вторую страницу
//       const page2 = await UserModel.list({ page: 2, limit: 2 })
//       expect(page2.data).toHaveLength(2)
//       expect(page2.page).toBe(2)
//
//       // Получаем последнюю страницу
//       const page3 = await UserModel.list({ page: 3, limit: 2 })
//       expect(page3.data).toHaveLength(1) // Последний пользователь
//       expect(page3.page).toBe(3)
//     })
//
//     it('should filter users by name', async () => {
//       await Promise.all([
//         UserModel.create({
//           email: 'john@example.com',
//           name: 'John Doe',
//           cart_id: null,
//           created_at: new Date(),
//           updated_at: new Date()
//         }),
//         UserModel.create({
//           email: 'jane@example.com',
//           name: 'Jane Doe',
//           cart_id: null,
//           created_at: new Date(),
//           updated_at: new Date()
//         }),
//         UserModel.create({
//           email: 'bob@example.com',
//           name: 'Bob Smith',
//           cart_id: null,
//           created_at: new Date(),
//           updated_at: new Date()
//         })
//       ])
//
//       const result = await UserModel.list({
//         page: 1,
//         limit: 10,
//         search: 'Doe'
//       })
//
//       expect(result.data).toHaveLength(2)
//       expect(result.data.every(user => user.name.includes('Doe'))).toBe(true)
//     })
//   })
// })
