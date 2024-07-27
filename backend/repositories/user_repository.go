package repositories

import (
	"backend/models"
	"database/sql"

	_ "github.com/lib/pq"
)

type UserRepository interface {
	CreateUser(user *models.User) error
	FindUserByEmail(email string) (*models.User, error)
}

type userRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{DB: db}
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
