package repositories

import (
	"backend/models"
	"database/sql"

	_ "github.com/lib/pq"
)

type UserRepository interface {
	CreateUser(user *models.User) error
	FindUserByEmail(email string) (*models.User, error)
	GetAllUsers() ([]*models.User, error)
	GetUserByID(id int) (*models.User, error)
	UpdateUser(user *models.User) error
	DeleteUser(id int) error
}

type userRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{DB: db}
}

func (r *userRepository) GetAllUsers() ([]*models.User, error) {
	query := "SELECT id, name, email, phone, role FROM users"
	rows, err := r.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Phone, &user.Role); err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, nil
}

func (r *userRepository) CreateUser(user *models.User) error {
	query := "INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id"
	err := r.DB.QueryRow(query, user.Name, user.Email, user.Password, user.Phone, user.Role).Scan(&user.ID)
	return err
}

func (r *userRepository) FindUserByEmail(email string) (*models.User, error) {
	query := "SELECT id, name, email, password, phone, role FROM users WHERE email = $1"
	row := r.DB.QueryRow(query, email)

	var user models.User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.Password, &user.Phone, &user.Role)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *userRepository) GetUserByID(id int) (*models.User, error) {
	query := "SELECT id, name, email, phone, role FROM users WHERE id = $1"
	row := r.DB.QueryRow(query, id)

	var user models.User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.Phone, &user.Role)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *userRepository) UpdateUser(user *models.User) error {
	query := "UPDATE users SET name = $1, email = $2, phone = $3, role = $4 WHERE id = $5"
	_, err := r.DB.Exec(query, user.Name, user.Email, user.Phone, user.Role, user.ID)
	return err
}

func (r *userRepository) DeleteUser(id int) error {
	query := "DELETE FROM users WHERE id = $1"
	_, err := r.DB.Exec(query, id)
	return err
}
